import {useQuery} from "@tanstack/react-query";

export const useCheckUser = (login: string) => {
    return useQuery({
        queryKey: ["checkUser", login],
        queryFn: async () => {
            const res = await fetch("/api/auth/check-user?login=" + login);
            if (!res.ok) throw new Error("Xato tekshiruvda");
            return res.json(); 
        },
        enabled: !!login,
    });
};
