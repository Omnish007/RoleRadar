import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type CompanyDocument = HydratedDocument<Company>;

@Schema({ timestamps: true, versionKey: false })
export class Company {
  @Prop({ required: true, trim: true, maxlength: 160 }) name: string;
  @Prop({ trim: true }) website?: string;
  @Prop({ trim: true }) careersUrl?: string;
  @Prop({ trim: true, maxlength: 120 }) industry?: string;
  @Prop({ required: true, enum: ["startup", "product", "service", "mnc", "other"], default: "other" }) companyType: string;
  @Prop({ trim: true, maxlength: 200 }) location?: string;
  @Prop({ trim: true, maxlength: 5000 }) notes?: string;
  @Prop({ required: true, enum: ["preferred", "neutral", "avoid"], default: "neutral" }) preference: string;
  @Prop({ required: true, unique: true }) normalizedName: string;
}
export const CompanySchema = SchemaFactory.createForClass(Company);
CompanySchema.index({ preference: 1, name: 1 });
