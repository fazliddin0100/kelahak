import {useEffect, useState} from "react";
import {IUserPopulated} from "@/types/user";

export const useSessionsUsers = () => {
    const [users, setUsers] = useState<IUserPopulated[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            const token = localStorage.getItem("token");
            try {
                const res = await fetch("/api/users", {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                const json = await res.json();
                setUsers(json.users || []); // backend populate qilib yuboradi
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    return {users, loading};
};
