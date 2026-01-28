import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";

@Entity("app_data")
export class AppData {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "jsonb" })
  defectsData: Record<string, any>;

  @Column({ type: "jsonb" })
  ratesData: Record<string, any>;

  @Column({ type: "jsonb" })
  representativesData: Record<string, any>;

  @Column({ type: "jsonb" })
  functions: Record<string, any>;
}
