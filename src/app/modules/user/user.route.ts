import express from 'express'
import { UserController } from './user.controller'
import auth from '../../middleware/auth'
import { ADMIN_ROLES, USER_ROLES } from '../../../enum/user'
import fileUploadHandler from '../../middleware/fileUploadHandler'

const router = express.Router()

router.get(
  '/me',
  auth(USER_ROLES.PROPERTY_MANAGER, USER_ROLES.SERVICE_PROVIDER, ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPER_ADMIN),
  UserController.getProfile,
)
router.get('/', auth(ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPER_ADMIN), UserController.getAllUser);
router.patch(
  '/profile',
  auth(USER_ROLES.PROPERTY_MANAGER, USER_ROLES.SERVICE_PROVIDER, ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPER_ADMIN),
  fileUploadHandler(),
  UserController.updateProfile,
)

// delete my account
router.delete(
  '/me',
  auth(USER_ROLES.PROPERTY_MANAGER, USER_ROLES.SERVICE_PROVIDER, ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPER_ADMIN),
  UserController.deleteMyAccount,
)

// get single user
router.get('/:id', UserController.getSingleUser)


// delete user
router.delete('/:id', auth(ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPER_ADMIN), UserController.deleteUser)

export const UserRoutes = router
