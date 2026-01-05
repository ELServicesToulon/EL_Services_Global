export const MOCK_TOUR = {
    id: "tour_20260103_001",
    courierName: "Jean Dupont",
    date: "2026-01-03",
    status: "in_progress", // pending, in_progress, completed
    totalStops: 5,
    completedStops: 1,
    stops: [
        {
            id: "stop_1",
            type: "pickup", // pickup or dropoff
            name: "Pharmacie Centrale",
            address: "12 Rue de la Paix, 75001 Paris",
            timeWindow: "09:00 - 09:30",
            status: "completed", // pending, completed, issue, skipped
            notes: "Colis prêt sur le comptoir.",
            contact: "Mme Martin",
            phone: "01 23 45 67 89",
            packages: [
                { id: "pkg_A1", description: "Sac isotherme (Insuline)", status: "picked_up" },
                { id: "pkg_A2", description: "Carton standard", status: "picked_up" }
            ],
            completedAt: "2026-01-03T09:15:00Z"
        },
        {
            id: "stop_2",
            type: "dropoff",
            name: "EHPAD Les Magnolias",
            address: "45 Avenue des Fleurs, 75013 Paris",
            timeWindow: "10:00 - 10:30",
            status: "pending",
            notes: "",
            contact: "Accueil",
            phone: "01 98 76 54 32",
            packages: [
                { id: "pkg_A1", description: "Sac isotherme (Insuline)", status: "pending" },
                { id: "pkg_A2", description: "Carton standard", status: "pending" }
            ]
        },
        {
            id: "stop_3",
            type: "pickup",
            name: "Laboratoire BioAnalyse",
            address: "8 Boulevard Voltaire, 75011 Paris",
            timeWindow: "11:00 - 11:15",
            status: "pending",
            notes: "",
            contact: "Secrétariat",
            phone: "01 11 22 33 44",
            packages: [
                { id: "pkg_B1", description: "Prélèvements sanguins (Urgent)", status: "pending" }
            ]
        },
        {
            id: "stop_4",
            type: "dropoff",
            name: "Clinique des Lilas",
            address: "22 Rue des Lilas, 93260 Les Lilas",
            timeWindow: "11:45 - 12:15",
            status: "pending",
            notes: "",
            contact: "Dr. Dupont",
            phone: "06 00 00 00 00",
            packages: [
                { id: "pkg_B1", description: "Prélèvements sanguins (Urgent)", status: "pending" }
            ]
        },
        {
            id: "stop_5",
            type: "dropoff",
            name: "Patient: Mme Durand",
            address: "5 Rue de la Liberté, 94220 Charenton",
            timeWindow: "13:00 - 13:30",
            status: "issue", // Example of an issue
            notes: "Interphone ne fonctionne pas, client absent.",
            contact: "Mme Durand",
            phone: "06 12 34 56 78",
            packages: [], // Maybe purely a service stop or packages implicit?
            issueDetail: "Client absent"
        }
    ]
};
