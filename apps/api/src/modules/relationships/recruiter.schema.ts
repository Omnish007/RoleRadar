import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type RecruiterDocument = HydratedDocument<Recruiter>;

@Schema({ timestamps: true, versionKey: false })
export class Recruiter {
  @Prop({ required: true, trim: true, maxlength: 160 }) name: string;
  @Prop({ trim: true, maxlength: 120 }) role?: string;
  @Prop({ trim: true, maxlength: 160 }) companyName?: string;
  @Prop({ trim: true, lowercase: true, maxlength: 254 }) email?: string;
  @Prop({ trim: true, maxlength: 2048 }) profileUrl?: string;
  @Prop({ trim: true, maxlength: 5000 }) notes?: string;
}
export const RecruiterSchema = SchemaFactory.createForClass(Recruiter);
RecruiterSchema.index({ companyName: 1, name: 1 });
RecruiterSchema.index({ email: 1 }, { sparse: true });
