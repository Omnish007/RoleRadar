import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Schema as MongooseSchema, Types } from "mongoose";

export type InterviewDocument = HydratedDocument<Interview>;

@Schema({ timestamps: true, versionKey: false })
export class Interview {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "Opportunity", required: true }) opportunityId: Types.ObjectId;
  @Prop({ required: true, trim: true, maxlength: 120 }) roundName: string;
  @Prop({ required: true, type: Date }) scheduledAt: Date;
  @Prop({ required: true, enum: ["online", "phone", "onsite", "other"], default: "online" }) mode: string;
  @Prop({ trim: true, maxlength: 160 }) interviewer?: string;
  @Prop({ trim: true, maxlength: 5000 }) notes?: string;
  @Prop({ required: true, enum: ["scheduled", "completed", "cancelled", "rescheduled"], default: "scheduled" }) status: string;
}
export const InterviewSchema = SchemaFactory.createForClass(Interview);
InterviewSchema.index({ scheduledAt: 1, status: 1 });
InterviewSchema.index({ opportunityId: 1, scheduledAt: 1 });
