import { Body, ConflictException, Controller, Get, Post } from '@nestjs/common';
import { Company } from '../../db/models/Company';
import {
  Ticket,
  TicketCategory,
  TicketStatus,
  TicketType,
} from '../../db/models/Ticket';
import { User, UserRole } from '../../db/models/User';
import { Sequelize } from 'sequelize-typescript';
import { Op } from 'sequelize';

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

    // Handle strikeOff ticket type in separate function
    // as the logic is quite different than the others
    if (type === TicketType.strikeOff) {
      return await this.createStrikeOffTicket(companyId);
    }

    const category =
      type === TicketType.managementReport
        ? TicketCategory.accounting
        : TicketCategory.corporate;

    const userRole =
      type === TicketType.managementReport
        ? UserRole.accountant
        : UserRole.corporateSecretary;

    const assignees = await User.findAll({
      where: { companyId, role: userRole },
      order: [['createdAt', 'DESC']],
    });

    if (!assignees.length)
      throw new ConflictException(
        `Cannot find user with role ${userRole} to create a ticket`,
      );

    if (userRole === UserRole.corporateSecretary && assignees.length > 1)
      throw new ConflictException(
        `Multiple users with role ${userRole}. Cannot create a ticket`,
      );

    const assignee = assignees[0];

    const ticket = await Ticket.create({
      companyId,
      assigneeId: assignee.id,
      category,
      type,
      status: TicketStatus.open,
    });

    return this.createTicketDto(ticket);
  }

  /**
   * Creates a strikeOff ticket and resolves all other active tickets for the company
   */
  private async createStrikeOffTicket(companyId: number): Promise<TicketDto> {
    // Find director for the company
    const directors = await User.findAll({
      where: { companyId, role: UserRole.director },
      order: [['createdAt', 'DESC']],
    });

    if (!directors.length) {
      throw new ConflictException(
        `Cannot find user with role ${UserRole.director} to create a strikeOff ticket`,
      );
    }

    if (directors.length > 1) {
      throw new ConflictException(
        `Multiple users with role ${UserRole.director}. Cannot create a strikeOff ticket`,
      );
    }

    const director = directors[0];

    // Use transaction to ensure data consistency
    const sequelize = Ticket.sequelize;
    if (!sequelize) {
      throw new Error('Sequelize instance not available');
    }
    const transaction = await sequelize.transaction();

    try {
      // Create the strikeOff ticket
      const ticket = await Ticket.create({
        companyId,
        assigneeId: director.id,
        category: TicketCategory.management,
        type: TicketType.strikeOff,
        status: TicketStatus.open,
      }, { transaction });

      // Resolve all other active tickets for this company
      await Ticket.update(
        { status: TicketStatus.resolved },
        {
          where: {
            companyId,
            status: TicketStatus.open,
            id: { [Op.ne]: ticket.id } // Exclude the newly created ticket
          },
          transaction
        }
      );

      // Commit the transaction
      await transaction.commit();

      return this.createTicketDto(ticket);
    } catch (error) {
      // Rollback the transaction in case of errorAdd commentMore actions
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Creates a DTO from a ticket entity
   */
  private createTicketDto(ticket: Ticket): TicketDto {
    return {
      id: ticket.id,
      type: ticket.type,
      assigneeId: ticket.assigneeId,
      status: ticket.status,
      category: ticket.category,
      companyId: ticket.companyId,
    };
  }
}
