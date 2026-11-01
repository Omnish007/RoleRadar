import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { BackupImport } from "@roleradar/contracts";
import { SearchProfile, SearchProfileDocument } from "../search/search-profile.schema";
import { SearchRun, SearchRunDocument } from "../search/search-run.schema";
import { Opportunity, OpportunityDocument } from "../opportunities/opportunity.schema";
import { Notification, NotificationDocument } from "../notifications/notification.schema";
import { Company, CompanyDocument } from "../relationships/company.schema";
import { Recruiter, RecruiterDocument } from "../relationships/recruiter.schema";
import { Interview, InterviewDocument } from "../relationships/interview.schema";
import { Resume, ResumeDocument } from "../resumes/resume.schema";
import { normalizeEntityName } from "../../common/normalizers/name.normalizer";

@Injectable()
export class BackupService {
  constructor(
    @InjectModel(SearchProfile.name) private readonly profiles: Model<SearchProfileDocument>,
    @InjectModel(SearchRun.name) private readonly runs: Model<SearchRunDocument>,
    @InjectModel(Opportunity.name) private readonly opportunities: Model<OpportunityDocument>,
    @InjectModel(Notification.name) private readonly notifications: Model<NotificationDocument>,
    @InjectModel(Company.name) private readonly companies: Model<CompanyDocument>,
    @InjectModel(Recruiter.name) private readonly recruiters: Model<RecruiterDocument>,
    @InjectModel(Interview.name) private readonly interviews: Model<InterviewDocument>,
    @InjectModel(Resume.name) private readonly resumes: Model<ResumeDocument>
  ) {}

  async exportData() {
    const [profiles, resumes, opportunities, searchRuns, companies, recruiters, interviews, notifications] = await Promise.all([
      this.profiles.find().lean().exec(), this.resumes.find().lean().exec(), this.opportunities.find().lean().exec(),
      this.runs.find().lean().exec(), this.companies.find().lean().exec(), this.recruiters.find().lean().exec(),
      this.interviews.find().lean().exec(), this.notifications.find().lean().exec()
    ]);
    const exportProfiles = profiles.map(({ collectionName, ...profile }) => ({
      ...profile,
      collection: collectionName || "General"
    }));
    return JSON.parse(JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), profiles: exportProfiles, resumes, opportunities, searchRuns, companies, recruiters, interviews, notifications }));
  }

  async createAutomaticBackup() {
    const directory = process.env.BACKUP_DIR || join(homedir(), ".local", "share", "roleradar", "backups");
    await fs.mkdir(directory, { recursive: true, mode: 0o700 });
    await fs.chmod(directory, 0o700);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `roleradar-auto-${stamp}.json`;
    const target = join(directory, fileName);
    const temporary = `${target}.tmp`;
    const snapshot = await this.exportData();
    await fs.writeFile(temporary, JSON.stringify(snapshot, null, 2), { encoding: "utf8", mode: 0o600, flag: "wx" });
    await fs.chmod(temporary, 0o600);
    await fs.rename(temporary, target);
    await this.pruneAutomaticBackups(directory);
    return { fileName, directory, createdAt: new Date().toISOString() };
  }

  async getBackupStatus() {
    const directory = process.env.BACKUP_DIR || join(homedir(), ".local", "share", "roleradar", "backups");
    try {
      const entries = await fs.readdir(directory, { withFileTypes: true });
      const files = await Promise.all(entries.filter((entry) => entry.isFile() && /^roleradar-auto-.*\.json$/.test(entry.name)).map(async (entry) => {
        const details = await fs.stat(join(directory, entry.name));
        return { fileName: entry.name, sizeBytes: details.size, modifiedAt: details.mtime.toISOString() };
      }));
      files.sort((left, right) => right.modifiedAt.localeCompare(left.modifiedAt));
      return { directory, latest: files[0] || null, count: files.length };
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
        return { directory, latest: null, count: 0 };
      }
      throw error;
    }
  }

  async importData(data: BackupImport) {
    const importedOpportunityIds = new Set(data.opportunities.map((item) => item._id));
    const referencedIds = [...new Set(data.interviews.map((item) => item.opportunityId))];
    const existingIds = await this.opportunities.find({ _id: { $in: referencedIds } }).distinct("_id");
    const existingOpportunityIds = new Set(existingIds.map((id) => String(id)));
    const missing = referencedIds.filter((id) => !importedOpportunityIds.has(id) && !existingOpportunityIds.has(id));
    if (missing.length) throw new BadRequestException(`Backup contains interviews linked to missing opportunities: ${missing.length}.`);

    const results = [
      await this.upsert(this.profiles, data.profiles.map(({ collection, ...profile }) => ({
        ...profile,
        collectionName: collection || "General"
      }))),
      await this.upsert(this.resumes, data.resumes),
      await this.upsert(this.opportunities, data.opportunities),
      await this.upsert(this.runs, data.searchRuns),
      await this.upsert(this.companies, data.companies.map((item) => ({ ...item, normalizedName: normalizeEntityName(item.name) }))),
      await this.upsert(this.recruiters, data.recruiters),
      await this.upsert(this.interviews, data.interviews),
      await this.upsert(this.notifications, data.notifications)
    ];
    return {
      imported: results.reduce((total, count) => total + count, 0),
      collections: { profiles: data.profiles.length, resumes: data.resumes.length, opportunities: data.opportunities.length, searchRuns: data.searchRuns.length, companies: data.companies.length, recruiters: data.recruiters.length, interviews: data.interviews.length, notifications: data.notifications.length }
    };
  }

  private async pruneAutomaticBackups(directory: string) {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    const files = await Promise.all(entries.filter((entry) => entry.isFile() && /^roleradar-auto-.*\.json$/.test(entry.name)).map(async (entry) => ({
      path: join(directory, entry.name), modifiedAt: (await fs.stat(join(directory, entry.name))).mtimeMs
    })));
    files.sort((left, right) => right.modifiedAt - left.modifiedAt);
    await Promise.all(files.slice(30).map((file) => fs.unlink(file.path)));
  }

  private async upsert<T extends { _id: string }>(model: Model<any>, records: T[]): Promise<number> {
    if (!records.length) return 0;
    const operations = records.map(({ _id, ...data }) => ({
      updateOne: { filter: { _id: new Types.ObjectId(_id) }, update: { $set: data }, upsert: true }
    }));
    const result = await model.bulkWrite(operations, { ordered: false });
    return result.upsertedCount + result.modifiedCount;
  }
}
