import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { CompanyInput, CompanyPreference, InterviewInput, RecruiterInput } from "@roleradar/contracts";
import { Company, CompanyDocument } from "./company.schema";
import { Recruiter, RecruiterDocument } from "./recruiter.schema";
import { Interview, InterviewDocument } from "./interview.schema";
import { Opportunity, OpportunityDocument } from "../opportunities/opportunity.schema";
import { normalizeEntityName } from "../../common/normalizers/name.normalizer";

@Injectable()
export class RelationshipsService {
  constructor(
    @InjectModel(Company.name) private readonly companies: Model<CompanyDocument>,
    @InjectModel(Recruiter.name) private readonly recruiters: Model<RecruiterDocument>,
    @InjectModel(Interview.name) private readonly interviews: Model<InterviewDocument>,
    @InjectModel(Opportunity.name) private readonly opportunities: Model<OpportunityDocument>
  ) {}

  listCompanies() { return this.companies.find().sort({ preference: 1, name: 1 }).limit(500).lean().exec(); }
  async createCompany(input: CompanyInput) {
    const normalizedName = normalizeEntityName(input.name);
    try {
      const company = await this.companies.create({ ...input, normalizedName });
      await this.syncCompanyPreference(company.name, input.preference);
      return company;
    }
    catch (error) {
      if (this.isDuplicate(error)) throw new ConflictException("This company is already saved.");
      throw error;
    }
  }

  async updateCompanyPreference(id: string, preference: CompanyPreference) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException("Company not found.");
    const company = await this.companies.findByIdAndUpdate(id, { preference }, { new: true, runValidators: true });
    if (!company) throw new NotFoundException("Company not found.");
    await this.syncCompanyPreference(company.name, preference);
    return company;
  }

  listRecruiters() { return this.recruiters.find().sort({ companyName: 1, name: 1 }).limit(1000).lean().exec(); }
  createRecruiter(input: RecruiterInput) { return this.recruiters.create(input); }

  listInterviews() {
    return this.interviews.find().populate("opportunityId", "title company source status")
      .sort({ scheduledAt: 1 }).limit(1000).lean().exec();
  }
  async createInterview(input: InterviewInput) {
    const opportunity = await this.opportunities.findById(new Types.ObjectId(input.opportunityId));
    if (!opportunity) throw new NotFoundException("Opportunity not found.");
    return this.interviews.create({
      ...input,
      opportunityId: new Types.ObjectId(input.opportunityId),
      scheduledAt: new Date(input.scheduledAt)
    });
  }
  async updateInterviewStatus(id: string, status: InterviewInput["status"]) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException("Interview not found.");
    const item = await this.interviews.findByIdAndUpdate(id, { status }, { new: true, runValidators: true });
    if (!item) throw new NotFoundException("Interview not found.");
    return item;
  }

  private async syncCompanyPreference(name: string, preference: CompanyPreference) {
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    await this.opportunities.updateMany(
      { company: { $regex: `^${escapedName}$`, $options: "i" } },
      { $set: { companyPreference: preference } }
    );
  }

  private isDuplicate(error: unknown): boolean {
    return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
  }
}
