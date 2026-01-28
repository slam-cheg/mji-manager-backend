import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, nullable: true })
  login: string;

  @Column({ nullable: true })
  password: string;

  @Column({ unique: true, nullable: true })
  usid: string;

  @Column({ unique: true, nullable: true })
  key: string;

  @Column({ nullable: true }) // ✅ Добавляем поле `fio`
  fio?: string;

  @Column({ default: false })
  activated: boolean;

  @Column({ default: false })
  isAdmin: boolean;

  @Column({ type: "text", nullable: true })
  refreshToken: string | null;
}
