import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';
import { Blog } from './blog.service';

export interface PendingBlog {
  offlineId: string; // Unique ID for offline storage
  blog: Blog;
  imageFile?: File; // Store image file for new blogs
  operation: 'create' | 'update';
  createdAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class OfflineStorageService extends Dexie {
  pendingBlogs!: Table<PendingBlog>;

  constructor() {
    super('BlogDatabase');
    this.version(2).stores({
      pendingBlogs: 'offlineId, operation, createdAt' // Updated schema
    });
  }

  async addPendingBlog(blog: Blog, operation: 'create' | 'update', imageFile?: File): Promise<void> {
    const offlineId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`; // Unique ID
    await this.pendingBlogs.put({
      offlineId,
      blog,
      imageFile,
      operation,
      createdAt: new Date()
    });
  }

  async getPendingBlogs(): Promise<PendingBlog[]> {
    return await this.pendingBlogs.orderBy('createdAt').toArray();
  }

  async getPendingBlog(offlineId: string): Promise<PendingBlog | undefined> {
    return await this.pendingBlogs.where('offlineId').equals(offlineId).first();
  }

  async removePendingBlog(offlineId: string): Promise<void> {
    await this.pendingBlogs.where('offlineId').equals(offlineId).delete();
  }

  async clearPendingBlogs(): Promise<void> {
    await this.pendingBlogs.clear();
  }
}