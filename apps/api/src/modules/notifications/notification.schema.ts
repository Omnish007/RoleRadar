import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type NotificationDocument = HydratedDocument<Notification>;

@Schema({ timestamps: true, versionKey: false })
export class Notification {
  @Prop({ required: true, unique: true }) dedupeKey: string;
  @Prop({ required: true, trim: true, maxlength: 160 }) title: string;
  @Prop({ required: true, trim: true, maxlength: 500 }) message: string;
  @Prop({ required: true, enum: ["reminder", "system"] }) type: string;
  @Prop({ type: Date, default: null }) readAt: Date | null;
  @Prop({ type: String, default: null }) opportunityId: string | null;
}
export const NotificationSchema = SchemaFactory.createForClass(Notification);
NotificationSchema.index({ readAt: 1, createdAt: -1 });
