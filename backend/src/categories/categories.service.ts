
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService implements OnModuleInit {
  private readonly logger = new Logger(CategoriesService.name);
  private categoriesCache: any[] = [];
  private categoriesTreeCache: any[] = [];

  constructor(private prisma: PrismaService) { }

  async onModuleInit() {
    await this.refreshCache();
  }

  /**
   * Loads all categories from DB into memory.
   * This is efficient because categories change rarely.
   */
  async refreshCache() {
    this.logger.log('Refreshing Categories Cache...');
    const allCategories = await this.prisma.categories.findMany({
      where: { is_active: true },
      select: {
        id: true,
        name: true,
        parent_id: true,
        icon: true,
      },
      orderBy: { name: 'asc' },
    });

    this.categoriesCache = allCategories;
    this.categoriesTreeCache = this.buildCategoryTree(allCategories);
    this.logger.log(`Loaded ${allCategories.length} categories into memory.`);
  }

  findAll() {
    // Return the pre-calculated tree from memory (0ms latency/0 DB calls)
    return this.categoriesTreeCache;
  }

  findOne(id: string) {
    return this.categoriesCache.find((c) => c.id === id);
  }

  /**
   * Converts flat list [ {id:1, parent:null}, {id:2, parent:1} ]
   * into nested tree [ {id:1, children: [ {id:2} ] } ]
   */
  private buildCategoryTree(categories: any[]) {
    const map = new Map();
    const roots: any[] = [];

    // 1. Initialize map
    categories.forEach((cat) => {
      map.set(cat.id, { ...cat, children: [] });
    });

    // 2. Connect parents and children
    categories.forEach((cat) => {
      if (cat.parent_id) {
        const parent = map.get(cat.parent_id);
        if (parent) {
          parent.children.push(map.get(cat.id));
        } else {
          // Orphan category? Treat as root or log error.
          roots.push(map.get(cat.id));
        }
      } else {
        roots.push(map.get(cat.id));
      }
    });

    return roots;
  }
}
