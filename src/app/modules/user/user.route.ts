import express from 'express'
import { UserController } from './user.controller'
import auth from '../../middleware/auth'
import { ADMIN_ROLES, USER_ROLES } from '../../../enum/user'
import { fileAndBodyProcessorUsingDiskStorage } from '../../middleware/processReqBody'

const router = express.Router()

router.get(
  '/me',
  auth(USER_ROLES.PROPERTY_MANAGER, USER_ROLES.SERVICE_PROVIDER, ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPER_ADMIN),
  UserController.getProfile,
)

router.get('/', auth(ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPER_ADMIN), UserController.getAllUser);

// Unified Profile Update Endpoint for all roles
router.patch(
  '/profile',
  auth(USER_ROLES.PROPERTY_MANAGER, USER_ROLES.SERVICE_PROVIDER, ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPER_ADMIN),
  fileAndBodyProcessorUsingDiskStorage(),
  UserController.updateProfile,
)

// Legacy alias routes pointing to unified profile update
router.patch(
  '/property-manager-profile',
  auth(USER_ROLES.PROPERTY_MANAGER),
  fileAndBodyProcessorUsingDiskStorage(),
  UserController.updateProfile,
)

router.patch(
  '/service-provider-profile',
  auth(USER_ROLES.SERVICE_PROVIDER),
  fileAndBodyProcessorUsingDiskStorage(),
  UserController.updateProfile,
)

// Delete my account
router.delete(
  '/me',
  auth(USER_ROLES.PROPERTY_MANAGER, USER_ROLES.SERVICE_PROVIDER, ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPER_ADMIN),
  UserController.deleteMyAccount,
)

// Get single user
router.get('/:id', UserController.getSingleUser)

// Delete user
router.delete('/:id', auth(ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPER_ADMIN), UserController.deleteUser)

export const UserRoutes = router
