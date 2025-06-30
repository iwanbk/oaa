import { Body, ConflictException, Controller, Get, Post } from '@nestjs/common';
import { Company } from '../../db/models/Company';
import {
  Ticket,
  TicketCategory,
  TicketStatus,
  TicketType,
} from '../../db/models/Ticket';
import { User, UserRole } from '../../db/models/User';

interface newTicketDto {
  type: TicketType;
  companyId: number;
}

interface TicketDto {
  id: number;
  type: TicketType;
  companyId: number;
  assigneeId: number;
  status: TicketStatus;
  category: TicketCategory;
}

@Controller('api/v1/tickets')
export class TicketsController {
  @Get()
  async findAll() {
    return await Ticket.findAll({ include: [Company, User] });
  }

  @Post()
  async create(@Body() newTicketDto: newTicketDto) {
    const { type, companyId } = newTicketDto;

    const category =
      type === TicketType.managementReport
        ? TicketCategory.accounting
        : TicketCategory.corporate;

    let userRole =
      type === TicketType.managementReport
        ? UserRole.accountant
        : UserRole.corporateSecretary;

    let assignees = await User.findAll({
      limit: 2,
      where: { companyId, role: userRole },
      order: [['createdAt', 'DESC']],
    });

    // For registrationAddressChange, if no corporate secretary is found, try to find a director
    if (type === TicketType.registrationAddressChange && !assignees.length) {
      userRole = UserRole.director;
      assignees = await User.findAll({
        limit: 2,
        where: { companyId, role: userRole },
        order: [['createdAt', 'DESC']],
      });
    }

    if (!assignees.length)
      throw new ConflictException(
        `Cannot find user with role ${userRole} to create a ticket`,
      );

    // Check for multiple users with the same role for corporate secretary and director
    if ((userRole === UserRole.corporateSecretary || userRole === UserRole.director) && assignees.length > 1)
      throw new ConflictException(
        `Multiple users with role ${userRole}. Cannot create a ticket`,
      );

    const assignee = assignees[0];

    try {
      const ticket = await Ticket.create({
        companyId,
        assigneeId: assignee.id,
        category,
        type,
        status: TicketStatus.open,
      });

      const ticketDto: TicketDto = {
        id: ticket.id,
        type: ticket.type,
        assigneeId: ticket.assigneeId,
        status: ticket.status,
        category: ticket.category,
        companyId: ticket.companyId,
      };

      return ticketDto;
    } catch (error) {
      // Handle unique constraint violation for registrationAddressChange
      if (error.name === 'SequelizeUniqueConstraintError' &&
        type === TicketType.registrationAddressChange) {
        throw new ConflictException(
          `Company already has a registrationAddressChange ticket`
        );
      }
      // Re-throw other errors
      throw error;
    }
  }
}