import config from '../../config'
import { ADMIN_ROLES, USER_STATUS } from '../../enum/user'
import { Admin } from '../modules/admin/admin.model'
import { logger } from '../../shared/logger'
import colors from 'colors'

export const seedAdmin = async () => {
    const adminEmail = config.super_admin.email
    const adminPassword = config.super_admin.password

    if (!adminEmail || !adminPassword) {
        logger.warn(
            colors.yellow(
                '⚠️ Admin email or password is not configured in .env. Skipping super admin seeding.'
            )
        )
        return
    }

    try {
        // Check if a super admin account already exists
        const isSuperAdminExist = await Admin.findOne({
            $or: [
                { role: ADMIN_ROLES.SUPER_ADMIN },
                { email: adminEmail.toLowerCase().trim() }
            ]
        })

        if (isSuperAdminExist) {
            logger.info(
                colors.blue(
                    'ℹ️ Super Admin account already exists. Skipping creation.'
                )
            )
            return
        }

        const adminName = config.super_admin.name || 'Super Admin'
        const nameParts = adminName.trim().split(/\s+/)
        const firstName = nameParts[0] || 'Super'
        const lastName = nameParts.slice(1).join(' ') || 'Admin'

        const superAdminData = {
            email: adminEmail.toLowerCase().trim(),
            password: adminPassword,
            firstName,
            lastName,
            role: ADMIN_ROLES.SUPER_ADMIN,
            verified: true,
            status: USER_STATUS.ACTIVE,
        }

        await Admin.create(superAdminData)
        logger.info(colors.green('🚀 Super Admin account seeded successfully!'))
    } catch (error) {
        logger.error(colors.red('❌ Failed to seed Super Admin account:'), error)
    }
}
