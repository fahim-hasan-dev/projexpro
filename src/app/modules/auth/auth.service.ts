import { StatusCodes } from 'http-status-codes'
import { IAuthResponse, IResetPassword } from './auth.interface'
import { User } from '../user/user.model'
import { Admin } from '../admin/admin.model'
import ApiError from '../../../errors/ApiError'
import { ADMIN_ROLES, USER_ROLES, USER_STATUS } from '../../../enum/user'
import { AuthHelper } from './auth.helper'
import {
  AuthCommonServices,
  authResponse,
} from './loginService'
import { ILoginData } from '../../../interfaces/auth'
import { emailTemplate } from '../../../shared/emailTemplate'
import { emailHelper } from '../../../helpers/emailHelper'
import { JwtPayload } from 'jsonwebtoken'
import { jwtHelper } from '../../../helpers/jwtHelper'
import config from '../../../config'
import bcrypt from 'bcrypt'
import cryptoToken, { generateOtp } from '../../../utils/crypto'
import { Token } from '../token/token.model'
import { IUser } from '../user/user.interface'
import { PROPERTY_MANAGER_PROFILE_FIELDS, SERVICE_PROVIDER_PROFILE_FIELDS } from '../user/user.service'
import mongoose from 'mongoose'

const getAccountByQuery = async (query: any, includeDeleted = false) => {
  const statusFilter = includeDeleted 
    ? { status: { $nin: [USER_STATUS.DELETED] } } 
    : { status: { $in: [USER_STATUS.ACTIVE, USER_STATUS.RESTRICTED] } }
  
  let accountData: any = await User.findOne({ ...query, ...statusFilter }).select('+authentication +password')
  let AccountModel: any = User
  if (!accountData) {
    accountData = await Admin.findOne({ ...query, ...statusFilter }).select('+authentication +password')
    AccountModel = Admin
  }
  return { accountData, AccountModel }
}

const getAccountById = async (id: string | mongoose.Types.ObjectId) => {
  let accountData: any = await User.findById(id).select('+authentication +password')
  let AccountModel: any = User
  if (!accountData) {
    accountData = await Admin.findById(id).select('+authentication +password')
    AccountModel = Admin
  }
  return { accountData, AccountModel }
}

export const createUser = async (payload: IUser & Record<string, any>) => {
  payload.email = payload.email?.toLowerCase().trim()
  const session = await mongoose.startSession()

  try {
    session.startTransaction()

    if (payload.role === (ADMIN_ROLES.ADMIN as any) || payload.role === (ADMIN_ROLES.SUPER_ADMIN as any)) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `Admin account creation is not allowed via standard user registration.`,
      )
    }

    const userRole = payload.role || USER_ROLES.PROPERTY_MANAGER

    // Isolate profile fields based on role
    let rawProfileData: Record<string, any> = {}
    if (payload.profile && typeof payload.profile === 'object') {
      Object.assign(rawProfileData, payload.profile)
    }
    if (userRole === USER_ROLES.PROPERTY_MANAGER && payload.propertyManagerProfile) {
      Object.assign(rawProfileData, payload.propertyManagerProfile)
    }
    if (userRole === USER_ROLES.SERVICE_PROVIDER && payload.serviceProviderProfile) {
      Object.assign(rawProfileData, payload.serviceProviderProfile)
    }

    const cleanProfile: Record<string, any> = {}
    const allowedFields = userRole === USER_ROLES.PROPERTY_MANAGER
      ? PROPERTY_MANAGER_PROFILE_FIELDS
      : userRole === USER_ROLES.SERVICE_PROVIDER
        ? SERVICE_PROVIDER_PROFILE_FIELDS
        : [...PROPERTY_MANAGER_PROFILE_FIELDS, ...SERVICE_PROVIDER_PROFILE_FIELDS]

    allowedFields.forEach((field) => {
      if (rawProfileData[field] !== undefined) {
        cleanProfile[field] = rawProfileData[field]
      }
    })

    if (Object.keys(cleanProfile).length > 0) {
      payload.profile = cleanProfile as any
    }

    const inputUserName = payload.userName || payload.username
    if (!inputUserName) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'User name is required.')
    }
    payload.userName = inputUserName.toLowerCase().trim()

    // 1. Check if user email or userName already exists
    const isEmailExist = await User.findOne({
      email: payload.email,
      status: { $nin: [USER_STATUS.DELETED] },
    }).session(session)

    if (isEmailExist) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `An account with this email already exists.`,
      )
    }

    const isUsernameExist = await User.findOne({
      userName: payload.userName,
      status: { $nin: [USER_STATUS.DELETED] },
    }).session(session)

    if (isUsernameExist) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `An account with userName '${payload.userName}' already exists.`,
      )
    }

    // 2. Generate OTP
    const otp = generateOtp()
    const otpExpiresIn = new Date(Date.now() + 5 * 60 * 1000)

    const authentication = {
      oneTimeCode: otp,
      expiresAt: otpExpiresIn,
      latestRequestAt: new Date(),
      requestCount: 1,
      authType: 'createAccount' as const,
      restrictionLeftAt: null,
      resetPassword: false,
      wrongLoginAttempts: 0,
    }

    // 3. Send OTP email
    setTimeout(() => {
      const createAccountEmail = emailTemplate.createAccount({
        name: `${payload.firstName} ${payload.lastName}`,
        email: payload.email,
        otp,
      })
      emailHelper.sendEmail(createAccountEmail)
    }, 0)

    // 4. Create User
    const user = await User.create(
      [
        {
          ...payload,
          password: payload.password,
          authentication,
          role: userRole,
        },
      ],
      { session },
    )


    if (!user[0])
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create user.')

    const createdUser = user[0]

    // 5. Commit Transaction
    await session.commitTransaction()
    return createdUser._id
  } catch (error) {
    // Rollback on error
    await session.abortTransaction()
    throw error
  } finally {
    session.endSession()
  }
}

const login = async (payload: ILoginData): Promise<IAuthResponse> => {
  const { email, phone } = payload
  const query = email ? { email: email.toLowerCase().trim() } : { phone: phone }

  const isUserExist = await User.findOne({
    ...query,
    status: { $in: [USER_STATUS.ACTIVE, USER_STATUS.RESTRICTED] },
  })
    .select('+password +authentication')
    .lean()

  if (!isUserExist) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `No account found with this ${email ? 'email' : 'phone'}`,
    )
  }

  const result = await AuthCommonServices.handleLoginLogic(payload, isUserExist)
  return result
}

const adminLogin = async (payload: ILoginData): Promise<IAuthResponse> => {
  const { email, phone } = payload
  const query = email ? { email: email.trim().toLowerCase() } : { phone: phone }

  let isExistAdmin: any = await Admin.findOne({
    ...query,
    status: { $nin: [USER_STATUS.DELETED] },
  })
    .select('+password +authentication')
    .lean()

  if (!isExistAdmin) {
    isExistAdmin = await User.findOne({
      ...query,
      status: { $nin: [USER_STATUS.DELETED] },
    })
      .select('+password +authentication')
      .lean()
  }

  if (!isExistAdmin) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `No admin account found with this ${email ? 'email' : 'phone'}`,
    )
  }

  if (
    isExistAdmin.role !== ADMIN_ROLES.ADMIN &&
    isExistAdmin.role !== ADMIN_ROLES.SUPER_ADMIN &&
    isExistAdmin.role !== 'admin'
  ) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'You are not authorized to login as admin',
    )
  }

  const isPasswordMatch = await AuthHelper.isPasswordMatched(
    payload.password,
    isExistAdmin.password as string,
  )

  if (!isPasswordMatch) {
    throw new ApiError(
      StatusCodes.UNAUTHORIZED,
      'Please try again with correct credentials.',
    )
  }

  // Create tokens
  const tokens = AuthHelper.createToken(
    isExistAdmin._id,
    isExistAdmin.role,
    `${isExistAdmin.firstName} ${isExistAdmin.lastName}`,
    isExistAdmin.email,
  )

  const userInfo = {
    id: isExistAdmin._id,
    role: isExistAdmin.role,
    name: `${isExistAdmin.firstName} ${isExistAdmin.lastName}`,
    email: isExistAdmin.email,
    image: isExistAdmin.image || '',
  }

  return authResponse(
    StatusCodes.OK,
    `Welcome back ${isExistAdmin.firstName}`,
    isExistAdmin.role,
    tokens.accessToken,
    tokens.refreshToken,
    undefined,
    userInfo,
  )
}

const forgetPassword = async (email?: string, phone?: string) => {
  const query = email
    ? { email: email.toLocaleLowerCase().trim() }
    : { phone: phone }
  
  const { accountData, AccountModel } = await getAccountByQuery(query)

  if (!accountData) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'No account found with this email or phone',
    )
  }

  const otp = generateOtp()

  const authentication = {
    resetPassword: true,
    oneTimeCode: otp,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    latestRequestAt: new Date(),
    requestCount: 1,
    authType: 'resetPassword' as const,
    restrictionLeftAt: null,
    wrongLoginAttempts: 0,
  }

  await AccountModel.findByIdAndUpdate(
    accountData._id,
    {
      $set: { authentication: authentication },
    },
    { new: true },
  )

  // Send OTP to user
  if (email) {
    const forgetPasswordEmailTemplate = emailTemplate.resetPassword({
      name: `${accountData.firstName} ${accountData.lastName}`,
      email: accountData.email,
      otp,
    })

    setTimeout(() => {
      emailHelper.sendEmail(forgetPasswordEmailTemplate)
    }, 0)
  }

  return 'OTP sent successfully.'
}

const resetPassword = async (resetToken: string, payload: IResetPassword) => {
  const { newPassword, confirmPassword } = payload
  if (newPassword !== confirmPassword) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Passwords do not match')
  }

  const isTokenExist = await Token.findOne({ token: resetToken }).lean()

  if (!isTokenExist) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "You don't have authorization to reset your password, please verify your account first.",
    )
  }

  const { accountData, AccountModel } = await getAccountById(isTokenExist.user)

  if (!accountData) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Requested user not found, please try again or contact support.',
    )
  }

  const { authentication } = accountData
  if (!authentication?.resetPassword) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'You don\'t have permission to change the password. Please click again to "Forgot Password"',
    )
  }

  const isTokenValid = isTokenExist?.expireAt > new Date()
  if (!isTokenValid) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Your reset token has expired, please try again.',
    )
  }

  const hashPassword = await bcrypt.hash(
    newPassword,
    Number(config.bcrypt_salt_rounds),
  )

  const updatedUserData = {
    password: hashPassword,
    authentication: {
      resetPassword: false,
      oneTimeCode: '',
      expiresAt: null,
      latestRequestAt: new Date(),
      requestCount: 0,
      restrictionLeftAt: null,
      wrongLoginAttempts: 0,
    },
  }

  await AccountModel.findByIdAndUpdate(
    accountData._id,
    { $set: updatedUserData },
    { new: true },
  )

  return { message: 'Password reset successfully' }
}

const verifyAccount = async (
  email: string,
  onetimeCode: string,
): Promise<IAuthResponse> => {
  //verify fo new user
  if (!onetimeCode) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'OTP is required.')
  }
  const { accountData, AccountModel } = await getAccountByQuery(
    { email: email.toLowerCase().trim() },
    true
  )

  if (!accountData) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `No account found with this ${email}, please register first.`,
    )
  }

  const { authentication } = accountData

  //check the otp
  if (authentication?.oneTimeCode !== onetimeCode) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Invalid OTP, please try again.',
    )
  }

  const currentDate = new Date()
  if (authentication?.expiresAt! < currentDate) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'OTP has expired, please try again.',
    )
  }

  //either newly created user or existing user
  if (!accountData.verified) {
    await AccountModel.findByIdAndUpdate(
      accountData._id,
      { $set: { verified: true } },
      { new: true },
    )

    const tokens = AuthHelper.createToken(
      accountData._id,
      accountData.role,
      accountData.firstName + ' ' + accountData.lastName,
      accountData.email,
    )
    const userInfo = {
      id: accountData._id,
      role: accountData.role,
      name: `${accountData.firstName!} ${accountData.lastName!}`,
      email: accountData.email!,
      image: accountData.image!,
      verified:accountData.verified,
      approvalStatus:accountData.approvalStatus,
    }

    return authResponse(
      StatusCodes.OK,
      `Welcome ${accountData.firstName} ${accountData.lastName} to our platform.`,
      undefined,
      tokens.accessToken,
      tokens.refreshToken,
      undefined,
      userInfo,
    )
  } else {
    await AccountModel.findByIdAndUpdate(
      accountData._id,
      {
        $set: {
          authentication: {
            oneTimeCode: '',
            expiresAt: null,
            latestRequestAt: null,
            requestCount: 0,
            authType: '',
            resetPassword: true,
          },
        },
      },
      { new: true },
    )

    const token = await Token.create({
      token: cryptoToken(),
      user: accountData._id,
      expireAt: new Date(Date.now() + 5 * 60 * 1000), // 15 minutes
    })
    console.log(token.token)

    if (!token) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        ' please try again. or contact support.',
      )
    }

    return authResponse(
      StatusCodes.OK,
      'OTP verified successfully, please reset your password.',
      undefined,
      undefined,
      undefined,
      token.token,
    )
  }
}

const getAccessToken = async (token: string) => {
  if (!token) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Refresh Token is required')
  }

  try {
    const decodedToken = jwtHelper.verifyToken(
      token,
      config.jwt.jwt_refresh_secret as string,
    )

    const { userId, role } = decodedToken

    const tokens = AuthHelper.createToken(
      userId,
      role,
      decodedToken.name,
      decodedToken.email,
    )

    return {
      accessToken: tokens.accessToken,
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'TokenExpiredError') {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Refresh Token has expired')
    }
    throw new ApiError(StatusCodes.FORBIDDEN, 'Invalid Refresh Token')
  }
}


const resendOtpToPhoneOrEmail = async (
  authType: 'resetPassword' | 'createAccount',
  email?: string,
  phone?: string,
) => {
  const query = email ? { email: email } : { phone: phone }
  
  const { accountData, AccountModel } = await getAccountByQuery(query)

  if (!accountData) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `No account found with this ${email ? 'email' : 'phone'}`,
    )
  }

  // Check the request count
  const { authentication } = accountData
  if (authentication?.requestCount! >= 5) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'You have exceeded the maximum number of requests. Please try again later.',
    )
  }

  const otp = generateOtp()
  const updatedAuthentication = {
    ...authentication,
    oneTimeCode: otp,
    latestRequestAt: new Date(),
    requestCount: authentication?.requestCount! + 1,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
    authType: authType,
  }

  // Send OTP to user
  if (email) {
    const forgetPasswordEmailTemplate = emailTemplate.resendOtp({
      email: accountData.email,
      name: `${accountData.firstName} ${accountData.lastName}`,
      otp,
      type: authType,
    })

    await AccountModel.findByIdAndUpdate(
      accountData._id,
      {
        $set: { authentication: updatedAuthentication },
      },
      { new: true },
    )

    await emailHelper.sendEmail(forgetPasswordEmailTemplate)
  }

  if (phone) {
    // Implement this feature using aws sns
    await AccountModel.findByIdAndUpdate(
      accountData._id,
      {
        $set: { authentication: updatedAuthentication },
      },
      { new: true },
    )
  }
}

const deleteAccount = async (user: JwtPayload, password: string) => {
  const { authId } = user
  const { accountData, AccountModel } = await getAccountById(authId)

  if (!accountData) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Failed to delete account. Please try again.',
    )
  }

  if (accountData.status === USER_STATUS.DELETED) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Requested user is already deleted.',
    )
  }

  const isPasswordMatched = await bcrypt.compare(password, accountData.password)

  if (!isPasswordMatched) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Please provide a valid password to delete your account.',
    )
  }

  const deletedData = await AccountModel.findByIdAndUpdate(authId, {
    $set: { status: USER_STATUS.DELETED },
  })

  return {
    status: StatusCodes.OK,
    message: 'Account deleted successfully.',
    deletedData,
  }
}

const resendOtp = async (
  email: string,
  authType: 'createAccount' | 'resetPassword',
) => {
  const { accountData, AccountModel } = await getAccountByQuery({ email: email.toLowerCase().trim() })

  if (!accountData) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `No account found with this ${email}, please try again.`,
    )
  }

  const { authentication } = accountData

  const otp = generateOtp()
  const authenticationPayload = {
    ...authentication,
    oneTimeCode: otp,
    latestRequestAt: new Date(),
    requestCount: authentication?.requestCount! + 1,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
  }

  if (authenticationPayload.requestCount! >= 5) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'You have exceeded the maximum number of requests. Please try again later.',
    )
  }

  await AccountModel.findByIdAndUpdate(
    accountData._id,
    {
      $set: { authentication: authenticationPayload },
    },
    { new: true },
  )

  // Send OTP to user
  if (email) {
    const forgetPasswordEmailTemplate = emailTemplate.resendOtp({
      email: email,
      name: `${accountData.firstName} ${accountData.lastName}`,
      otp,
      type: authType,
    })

    setTimeout(() => {
      emailHelper.sendEmail(forgetPasswordEmailTemplate)
    }, 0)
  }

  return 'OTP sent successfully.'
}

const changePassword = async (
  user: JwtPayload,
  currentPassword: string,
  newPassword: string,
) => {
  const { accountData, AccountModel } = await getAccountById(user.authId)

  if (!accountData) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found')
  }

  // Check if current password matches
  const isPasswordMatch = await AuthHelper.isPasswordMatched(
    currentPassword,
    accountData.password as string,
  )

  if (!isPasswordMatch) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Current password is incorrect')
  }

  // Hash the new password
  const hashedPassword = await bcrypt.hash(
    newPassword,
    Number(config.bcrypt_salt_rounds),
  )

  // Update the password
  await AccountModel.findByIdAndUpdate(
    user.authId,
    { password: hashedPassword },
    { new: true },
  )

  return { message: 'Password changed successfully' }
}

const checkUserName = async (userName: string) => {
  if (!userName || !userName.trim()) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'userName parameter is required.')
  }

  const formattedUserName = userName.toLowerCase().trim()
  const isExist = await User.findOne({
    userName: formattedUserName,
    status: { $nin: [USER_STATUS.DELETED] },
  }).lean()

  return {
    userName: formattedUserName,
    username: formattedUserName,
    isAvailable: !isExist,
    exists: !!isExist,
  }
}

export const AuthServices = {
  forgetPassword,
  resetPassword,
  verifyAccount,
  login,
  getAccessToken,
  resendOtpToPhoneOrEmail,
  deleteAccount,
  resendOtp,
  changePassword,
  createUser,
  adminLogin,
  checkUserName,
  checkUsername: checkUserName,
}
