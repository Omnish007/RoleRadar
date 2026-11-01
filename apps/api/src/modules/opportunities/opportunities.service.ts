import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { OpportunityInput, OpportunityStatus, ReminderInput } from "@roleradar/contracts";
import { Opportunity, OpportunityDocument } from "./opportunity.schema";
import { Company, CompanyDocument } from "../relationships/company.schema";
import { normalizeEntityName } from "../../common/normalizers/name.normalizer";
import { NotificationsService } from "../notifications/notifications.service";

@Injectable()
export class OpportunitiesService {
  constructor(
    @InjectModel(Opportunity.name) private readonly model: Model<OpportunityDocument>,
    @InjectModel(Company.name) private readonly companies: Model<CompanyDocument>,
    private readonly notifications: NotificationsService
  ) {}

  findAll() { return this.model.find().sort({ updatedAt: -1 }).limit(500).lean().exec(); }

  async create(input: OpportunityInput) {
    const sourceUrl = this.canonicalizeUrl(input.sourceUrl);
    const normalizedCompany = normalizeEntityName(input.company);
    const company = await this.companies.findOne({ normalizedName: normalizedCompany }).lean().exec();
    const companyPreference = company?.preference || "neutral";
    const existing = await this.model.findOne({ sourceUrl }).lean().exec();
    if (existing) return { ...existing, duplicate: true };
    try { return await this.model.create({ ...input, sourceUrl, companyPreference, statusHistory: [{ status: "interested", changedAt: new Date() }] }); }
    catch (error) {
      if (this.isDuplicateKey(error)) throw new ConflictException("This opportunity has already been saved.");
      throw error;
    }
  }

  async updateStatus(id: string, status: OpportunityStatus) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException("Opportunity not found");
    const current = await this.model.findById(id);
    if (!current) throw new NotFoundException("Opportunity not found");
    if (current.status === status) return current;
    const terminal = ["offer", "rejected", "closed"].includes(status);
    const update = {
      $set: { status, ...(status === "applied" && !current.appliedAt ? { appliedAt: new Date() } : {}), ...(terminal ? { followUpAt: null } : {}) },
      $push: { statusHistory: { status, changedAt: new Date() } }
    };
    const updated = await this.model.findByIdAndUpdate(id, update, { new: true, runValidators: true });
    if (!updated) throw new NotFoundException("Opportunity not found");
    if (terminal && current.followUpAt) await this.notifications.cancelFollowUp(id, current.followUpAt);
    return updated;
  }

  async scheduleReminder(id: string, input: ReminderInput) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException("Opportunity not found");
    const opportunity = await this.model.findById(id);
    if (!opportunity) throw new NotFoundException("Opportunity not found");
    const dueAt = new Date(input.dueAt);
    const previousDueAt = opportunity.followUpAt;
    await this.notifications.scheduleFollowUp(id, opportunity.title, dueAt, input.message);
    opportunity.followUpAt = dueAt;
    try { await opportunity.save(); }
    catch (error) {
      await this.notifications.cancelFollowUp(id, dueAt);
      throw error;
    }
    if (previousDueAt && previousDueAt.getTime() !== dueAt.getTime()) {
      await this.notifications.cancelFollowUp(id, previousDueAt);
    }
    return { opportunityId: id, followUpAt: dueAt };
  }

  private canonicalizeUrl(rawUrl: string): string {
    const parsed = new URL(rawUrl);
    for (const key of [...parsed.searchParams.keys()]) {
      if (key.toLowerCase().startsWith("utm_") || ["trk", "trackingid", "ref"].includes(key.toLowerCase())) parsed.searchParams.delete(key);
    }
    parsed.hash = "";
    return parsed.toString();
  }

  private isDuplicateKey(error: unknown): boolean {
    return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
  }
}
