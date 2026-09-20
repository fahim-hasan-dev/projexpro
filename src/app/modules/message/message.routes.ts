import express from 'express';
import { ADMIN_ROLES, USER_ROLES } from '../../../enum/user';
import auth from '../../middleware/auth';
import { MessageController } from './message.controller';
import fileUploadHandler from '../../middleware/fileUploadHandler';
import { getSingleFilePath } from '../../../shared/getFilePath';
import { fileAndBodyProcessorUsingDiskStorage } from '../../middleware/processReqBody';

const router = express.Router();

// Send a message
router.post('/',
  auth(USER_ROLES.PROPERTY_MANAGER, USER_ROLES.SERVICE_PROVIDER, ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPER_ADMIN),
  fileAndBodyProcessorUsingDiskStorage(),
  MessageController.sendMessage
);

// Get messages for a chat
router.get(
  '/:id',
  auth(USER_ROLES.PROPERTY_MANAGER, USER_ROLES.SERVICE_PROVIDER, ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPER_ADMIN),
  MessageController.getMessage
);

// Update a message
router.patch(
  '/:id',
  auth(USER_ROLES.PROPERTY_MANAGER, USER_ROLES.SERVICE_PROVIDER, ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPER_ADMIN),
  MessageController.updateMessage
);

// Get total unread count
router.get(
  '/unread/count',
  auth(USER_ROLES.PROPERTY_MANAGER, USER_ROLES.SERVICE_PROVIDER, ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPER_ADMIN),
  MessageController.getUnreadCount
);

// Update money request status (accept/reject)
router.patch(
  '/:messageId/money-request',
  auth(USER_ROLES.PROPERTY_MANAGER, USER_ROLES.SERVICE_PROVIDER),
  MessageController.updateMoneyRequestStatus
);

// Delete a message
router.delete(
  '/:id',
  auth(USER_ROLES.PROPERTY_MANAGER, USER_ROLES.SERVICE_PROVIDER, ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPER_ADMIN),
  MessageController.deleteMessage
);

export const MessageRoutes = router;
