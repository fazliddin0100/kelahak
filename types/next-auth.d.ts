// types/next-auth.d.ts

declare module "next-auth" {
    interface Session {
        user: {
            id: string; // biz qo‘shgan field
            name?: string | null;
            email?: string | null;
            image?: string | null;
        };
    }
}
