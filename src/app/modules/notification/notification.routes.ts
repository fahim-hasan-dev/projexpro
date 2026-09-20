import express from 'express';
import auth from '../../middleware/auth';
import { ADMIN_ROLES, USER_ROLES } from '../../../enum/user';
import { NotificationController } from './notification.controller';
const router = express.Router();

router.get('/',
    auth(USER_ROLES.PROPERTY_MANAGER, USER_ROLES.SERVICE_PROVIDER, ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPER_ADMIN),
    NotificationController.getNotificationFromDB
);

router.get('/unread-count',
    auth(USER_ROLES.PROPERTY_MANAGER, USER_ROLES.SERVICE_PROVIDER, ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPER_ADMIN),
    NotificationController.getUnreadCount
);

router.post('/test-push', NotificationController.sendTestPushNotification);

export const NotificationRoutes = router;
