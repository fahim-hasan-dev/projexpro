import express from 'express';
import { AdminController } from './admin.controller';
import auth from '../../middleware/auth';
import { ADMIN_ROLES } from '../../../enum/user';
import validateRequest from '../../middleware/validateRequest';
import { AdminValidations } from './admin.validation';
import fileUploadHandler from '../../middleware/fileUploadHandler';

const router = express.Router();

router.get(
    '/me',
    auth(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
    AdminController.getAdminProfile
);

router.patch(
    '/me',
    auth(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
    fileUploadHandler(),
    AdminController.updateAdminProfile
);

router.post(
    '/',
    auth(ADMIN_ROLES.SUPER_ADMIN),
    validateRequest(AdminValidations.createAdminZodSchema),
    AdminController.createAdmin
);

router.get(
    '/',
    auth(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
    AdminController.getAllAdmins
);

router.get(
    '/:id',
    auth(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
    AdminController.getSingleAdmin
);

router.patch(
    '/:id',
    auth(ADMIN_ROLES.SUPER_ADMIN),
    validateRequest(AdminValidations.updateAdminZodSchema),
    AdminController.updateAdmin
);

router.get(
    '/property-managers',
    auth(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
    AdminController.getAllPropertyManagers
);

router.get(
    '/service-providers',
    auth(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
    AdminController.getAllServiceProviders
);

router.patch(
    '/users/:id/approval',
    auth(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
    validateRequest(AdminValidations.manageUserApprovalZodSchema),
    AdminController.manageUserApproval
);

router.patch(
    '/property-managers/:id/approval',
    auth(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
    validateRequest(AdminValidations.managePropertyManagerApprovalZodSchema),
    AdminController.managePropertyManagerApproval
);

router.delete(
    '/:id',
    auth(ADMIN_ROLES.SUPER_ADMIN),
    AdminController.deleteAdmin
);

export const AdminRoutes = router;
