export interface ProjectMemberResponse {
  id: string;
  projectId: string;
  userId: string;
  role: string;
  joinedAt: Date;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
  };
}

export interface ProjectResponse {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  owner: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
  members: ProjectMemberResponse[];
  taskCount: number;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}
