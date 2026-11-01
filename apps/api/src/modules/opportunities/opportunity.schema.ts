import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type OpportunityDocument = HydratedDocument<Opportunity>;

@Schema({ timestamps: true, versionKey: false })
export class Opportunity {
  @Prop({ required: true, trim: true, maxlength: 200 }) title: string;
  @Prop({ required: true, trim: true, maxlength: 160 }) company: string;
  @Prop({ required: true, enum: ["linkedin", "naukri", "indeed", "wellfound"] }) source: string;
  @Prop({ required: true, unique: true, maxlength: 2048 }) sourceUrl: string;
  @Prop({ maxlength: 200 }) location?: string;
  @Prop({ maxlength: 200 }) salaryText?: string;
  @Prop({ maxlength: 5000 }) notes?: string;
  @Prop({ enum: ["interested", "shortlisted", "applied", "screening", "interview", "offer", "rejected", "closed"], default: "interested" }) status: string;
  @Prop({ enum: ["preferred", "neutral", "avoid"], default: "neutral" }) companyPreference: string;
  @Prop({ type: Date, default: null }) followUpAt?: Date | null;
  @Prop({ type: Date, default: null }) appliedAt?: Date | null;
  @Prop({ type: [Object], default: [] }) statusHistory: { status: string; changedAt: Date }[];
}
export const OpportunitySchema = SchemaFactory.createForClass(Opportunity);
OpportunitySchema.index({ company: 1, title: 1 });
OpportunitySchema.index({ status: 1, updatedAt: -1 });
