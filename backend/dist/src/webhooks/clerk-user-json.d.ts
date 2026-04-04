import type { UserJSON } from '@clerk/backend';
export declare function clerkUserJsonToSyncParams(data: UserJSON): {
    clerkId: string;
    email: string;
    name: string;
    avatarUrl: string | undefined;
};
