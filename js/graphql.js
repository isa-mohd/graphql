export async function graphqlRequest({ url, token, query, variables = {} }) {
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query, variables })
    });
    
    if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`GraphQL request failed (${response.status}). ${text}`.trim());
    }
    
    const result = await response.json();
    
    if (result.errors?.length) {
        const messages = result.errors.map(e => e.message).join(', ');
        throw new Error(`GraphQL error: ${messages}`);
    }
    
    return result.data;
}

export const QUERIES = {
    user: `
        query GetUser($userId: Int!) {
            user(where: { id: { _eq: $userId } }) {
                id
                login
                campus
                createdAt
                attrs
            }
        }
    `,
    
    xpTotal: `
        query GetXpTotal($userId: Int!) {
            xp_total: transaction_aggregate(
                where: {
                    userId: { _eq: $userId }
                    type: { _eq: "xp" }
                    path: { _like: "/bahrain/bh-module/%" }
                    _not: { path: { _like: "/bahrain/bh-module/piscine-js/%" } }
                }
            ) {
                aggregate {
                    sum {
                        amount
                    }
                }
            }
        }
    `,
    
    projectsCount: `
        query GetProjectsCount($userId: Int!) {
            progress(
                where: {
                    user: { id: { _eq: $userId } }
                    object: { type: { _eq: "project" } }
                    isDone: { _eq: true }
                }
            ) {
                id
                grade
            }
        }
    `,
    
    xpTransactions: `
        query GetXpTransactions($userId: Int!) {
            transaction(
                where: {
                    userId: { _eq: $userId }
                    type: { _eq: "xp" }
                    path: { _like: "/bahrain/bh-module/%" }
                    _not: { path: { _like: "/bahrain/bh-module/piscine-js/%" } }
                }
                order_by: { createdAt: asc }
            ) {
                id
                amount
                createdAt
                path
                objectId
            }
        }
    `,
    
    allProjects: `
        query GetAllProjects($userId: Int!) {
            progress(
                where: {
                    user: { id: { _eq: $userId } }
                    object: { type: { _eq: "project" } }
                }
                order_by: { createdAt: desc }
            ) {
                id
                isDone
                grade
                createdAt
                path
                object {
                    id
                    name
                    type
                }
            }
        }
    `,
    
    transactions: `
        query GetTransactions($userId: Int!) {
            transaction(
                where: { userId: { _eq: $userId } }
                order_by: { createdAt: asc }
            ) {
                id
                type
                amount
                createdAt
                path
                object {
                    id
                    name
                    type
                }
            }
        }
    `,
    
    results: `
        query GetResults($userId: Int!) {
            result(
                where: { 
                    userId: { _eq: $userId }
                }
                order_by: { createdAt: desc }
                limit: 500
            ) {
                id
                grade
                createdAt
                path
                object {
                    id
                    name
                    type
                }
            }
        }
    `,
    
    audits: `
        query GetAudits($userId: Int!) {
            audit(
                where: { auditorId: { _eq: $userId } }
                order_by: { createdAt: desc }
            ) {
                id
                grade
                createdAt
                attrs
            }
        }
    `,
    
    skills: `
        query GetSkills($userId: Int!) {
            result(
                where: {
                    userId: { _eq: $userId }
                    grade: { _gte: 1 }
                    object: { type: { _in: ["exercise", "project"] } }
                }
                order_by: { createdAt: desc }
            ) {
                id
                grade
                path
                object {
                    name
                    type
                }
            }
        }
    `
};
