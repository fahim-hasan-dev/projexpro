import express from 'express';
import auth from '../../middleware/auth';
import { ChatController } from './chat.controller';
import { ADMIN_ROLES, USER_ROLES } from '../../../enum/user';

const router = express.Router();

// Create a regular chat between users
router.post(
  "/",
  auth(USER_ROLES.PROPERTY_MANAGER, USER_ROLES.SERVICE_PROVIDER, ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPER_ADMIN),
  async (req, res, next) => {
    try {
      req.body = {
        participants: [req.user.id, req.body.participant],
        isAdminSupport: false
      };
      next();
    } catch (error) {
      res.status(400).json({ message: "Failed to create chat" });
    }
  },
  ChatController.createChat
);


// Get all chats for current user
router.get(
  "/",
  auth(USER_ROLES.PROPERTY_MANAGER, USER_ROLES.SERVICE_PROVIDER, ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPER_ADMIN),
  ChatController.getChat
);


// Delete a chat
router.delete(
  "/:id",
  auth(USER_ROLES.PROPERTY_MANAGER, USER_ROLES.SERVICE_PROVIDER, ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPER_ADMIN),
  ChatController.deleteChat
);

export const ChatRoutes = router;
