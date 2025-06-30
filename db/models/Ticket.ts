import {
  Table,
  Column,
  Model,
  BelongsTo,
  ForeignKey,
  PrimaryKey,
  AutoIncrement,
} from 'sequelize-typescript';
import { Company } from './Company';
import { User } from './User';

export enum TicketStatus {
  open = 'open',
  resolved = 'resolved',
}

export enum TicketType {
  managementReport = 'managementReport',
  registrationAddressChange = 'registrationAddressChange',
}

export enum TicketCategory {
  accounting = 'accounting',
  corporate = 'corporate',
  management = 'management',
}

@Table({
  tableName: 'tickets',
  indexes: [
    {
      unique: true,
      fields: ['companyId', 'type'],
      where: {
        type: 'registrationAddressChange'
      },
      name: 'idx_unique_registration_address_change'
    }
  ]
})
export class Ticket extends Model {
  @AutoIncrement
  @PrimaryKey
  @Column
  declare id: number;

  @Column
  declare type: TicketType;

  @Column
  declare status: TicketStatus;

  @Column
  declare category: TicketCategory;

  @ForeignKey(() => Company)
  declare companyId: number;

  @ForeignKey(() => User)
  declare assigneeId: number;

  @BelongsTo(() => Company)
  company: Company;

  @BelongsTo(() => User)
  assignee: User;
}
