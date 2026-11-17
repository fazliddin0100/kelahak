import {useEffect, useState} from "react";

export interface ITashkilot {
    organ: string;
}

export const useTashkilot = () => {
    const [data, setData] = useState<ITashkilot | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch("/api/tashkilot");
                const json = await res.json();
                setData(json);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);
    return {data, loading};
};
