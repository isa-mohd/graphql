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
    // Get basic user info
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
    
    // Get XP total (filtered for bh-module excluding piscine-js)
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
    
    // Get projects count (passed and failed)
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
    
    // Get XP transactions for timeline (filtered for bh-module excluding piscine-js)
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
    
    // Get all projects for modal (using progress table)
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
    
    // Get all transactions for XP timeline
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
    
    // Get all results for pass/fail data
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
    
    // Get user audits data
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
    
    // Get user skills from results with good grades
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
