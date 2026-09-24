import { type Database } from '../../../shared/database';
import { OrganizationsRepository } from '../repositories/organizations.repository';

export class OrganizationService {
    private repository: OrganizationsRepository;

    constructor(private readonly db: Database) {
        this.repository = new OrganizationsRepository(db);
    }

    async createOrganization(data: { name: string; slug: string }) {
        return this.repository.create({
            name: data.name,
            slug: data.slug,
        });
    }
}