import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type ResumeDocument = HydratedDocument<Resume>;

@Schema({ timestamps: true, versionKey: false })
export class Resume {
  @Prop({ required: true, trim: true, maxlength: 120 }) title: string;
  @Prop({ trim: true, maxlength: 120 }) targetRole?: string;
  @Prop({ trim: true, maxlength: 80 }) versionLabel?: string;
  @Prop({ required: true, maxlength: 30000 }) content: string;
  @Prop({ trim: true, maxlength: 3000 }) notes?: string;
  @Prop({ type: [String], default: [] }) tags: string[];
}
export const ResumeSchema = SchemaFactory.createForClass(Resume);
ResumeSchema.index({ targetRole: 1, updatedAt: -1 });
