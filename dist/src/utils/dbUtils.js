import { and, eq, getTableName, gt, gte, ilike, inArray, isNull, like, lt, lte, ne, not, notInArray, sql } from "drizzle-orm";
import { db } from "../db/configuration.js";
function prepareSelectColumnsForQuery(table, columnsToSelect) {
    if (!columnsToSelect) {
        return null;
    }
    if (columnsToSelect.length === 0) {
        return {};
    }
    const columnsForQuery = {};
    // loop through columns and prepare the select query object
    columnsToSelect.map((column) => {
        return (columnsForQuery[column] = sql.raw(`${getTableName(table)}.${column}`));
    });
    return columnsForQuery;
}
// function prepareWhereQueryConditions<R extends DBTableRow>(
//   table: DBTable,
//   whereQueryData?: WhereQueryData<R>,
// ) {
//   if (
//     whereQueryData
//     && Object.keys(whereQueryData).length > 0
//     && whereQueryData.columns.length > 0
//   ) {
//     const { columns, values } = whereQueryData;
//     const whereQueries: SQL[] = [];
//     for (let i = 0; i < columns.length; i++) {
//       const columnInfo = sql.raw(
//         `${getTableName(table)}.${columns[i] as string}`,
//       );
//       if (typeof values[i] === "string" && values[i].includes("%")) {
//         whereQueries.push(sql`${columnInfo} ILIKE ${values[i]}`);
//       }
//       else if (columns[i] === "deleted_at") {
//         whereQueries.push(isNull(columnInfo));
//       }
//       else if (typeof values[i] === "object" && values[i] !== null) {
//         const value = values[i] as { gte?: Date | string; lte?: Date | string };
//         //   if (value.gte && value.lte) {
//         //     whereQueries.push(
//         //       sql`${columnInfo} BETWEEN ${value.gte} AND ${value.lte}`,
//         //     );
//         //   }
//         //   else if (value.gte) {
//         //     whereQueries.push(sql`${columnInfo} >= ${value.gte}`);
//         //   }
//         //   else if (value.lte) {
//         //     whereQueries.push(sql`${columnInfo} <= ${value.lte}`);
//         //   }
//         // }
//         // Handle inArray condition for location filtering
//         if ("inArray" in value && value.inArray && Array.isArray(value.inArray)) {
//           whereQueries.push(inArray((table as any)[columns[i] as string], value.inArray));
//         }
//         else if (value.gte && value.lte) {
//           whereQueries.push(
//             sql`${columnInfo} BETWEEN ${value.gte} AND ${value.lte}`,
//           );
//         }
//         else if (value.gte) {
//           whereQueries.push(sql`${columnInfo} >= ${value.gte}`);
//         }
//         else if (value.lte) {
//           whereQueries.push(sql`${columnInfo} <= ${value.lte}`);
//         }
//       }
//       else {
//         whereQueries.push(eq(columnInfo, values[i]));
//       }
//     }
//     return whereQueries;
//   }
//   return null;
// }
function prepareWhereQueryConditions(table, whereQueryData) {
    if (!whereQueryData?.columns.length)
        return null;
    const whereQueries = [];
    const orSearchQueries = [];
    const tableName = getTableName(table);
    for (let i = 0; i < whereQueryData.columns.length; i++) {
        const col = whereQueryData.columns[i];
        const operator = whereQueryData.operators?.[i] ?? "eq";
        const value = whereQueryData.values[i];
        const columnInfo = sql.raw(`${tableName}.${col}`);
        if (operator === "ilike") {
            orSearchQueries.push(ilike(columnInfo, value));
            continue;
        }
        switch (operator) {
            case "eq":
                whereQueries.push(eq(columnInfo, value));
                break;
            case "ne":
                whereQueries.push(ne(columnInfo, value));
                break;
            case "gt":
                whereQueries.push(gt(columnInfo, value));
                break;
            case "gte":
                whereQueries.push(gte(columnInfo, value));
                break;
            case "lt":
                whereQueries.push(lt(columnInfo, value));
                break;
            case "lte":
                whereQueries.push(lte(columnInfo, value));
                break;
            case "like":
                whereQueries.push(like(columnInfo, value));
                break;
            case "in":
                if (Array.isArray(value) && value.length === 0) {
                    whereQueries.push(sql `FALSE`);
                }
                else {
                    whereQueries.push(inArray(columnInfo, value));
                }
                break;
            case "notIn":
                if (Array.isArray(value) && value.length === 0) {
                    whereQueries.push(sql `TRUE`);
                }
                else {
                    whereQueries.push(notInArray(columnInfo, value));
                }
                break;
            case "isNull":
                whereQueries.push(isNull(columnInfo));
                break;
            case "isNotNull":
                whereQueries.push(not(isNull(columnInfo)));
                break;
            case "between":
                if (Array.isArray(value) && value.length === 2) {
                    whereQueries.push(sql `${columnInfo} BETWEEN ${value[0]} AND ${value[1]}`);
                }
                break;
            default:
                whereQueries.push(eq(columnInfo, value));
        }
    }
    // 🔥 Add all ilike search conditions with OR
    if (orSearchQueries.length > 0) {
        whereQueries.push(sql `(${sql.join(orSearchQueries, sql ` OR `)})`);
    }
    return whereQueries;
}
function prepareOrderByQueryConditions(table, orderByQueryData) {
    const orderByQueries = [];
    if (!orderByQueryData
        || Object.keys(orderByQueryData).length === 0
        || orderByQueryData.columns.length === 0) {
        const orderByQuery = sql.raw(`${getTableName(table)}.id desc`);
        orderByQueries.push(orderByQuery);
    }
    if (orderByQueryData
        && Object.keys(orderByQueryData).length > 0
        && orderByQueryData.columns.length > 0) {
        const { columns, values } = orderByQueryData;
        for (let i = 0; i < columns.length; i++) {
            const orderByQuery = sql.raw(`${getTableName(table)}.${columns[i]} ${values[i]}`);
            orderByQueries.push(orderByQuery);
        }
    }
    return orderByQueries;
}
function prepareInQueryCondition(table, inQueryData) {
    if (inQueryData
        && Object.keys(inQueryData).length > 0
        && inQueryData.values.length > 0) {
        const columnInfo = sql.raw(`${getTableName(table)}.${inQueryData.key}`);
        const inQuery = inArray(columnInfo, inQueryData.values);
        return inQuery;
    }
    return null;
}
async function executeQuery(table, whereQuery, columnsRequired, orderByConditions, inQueryCondition, paginationData, trx) {
    let dQuery = columnsRequired
        ? db.select(columnsRequired).from(table).$dynamic()
        : db.select().from(table).$dynamic();
    if (whereQuery && inQueryCondition) {
        dQuery = dQuery.where(and(whereQuery, inQueryCondition));
    }
    else if (whereQuery) {
        dQuery = dQuery.where(whereQuery);
    }
    else if (inQueryCondition) {
        dQuery = dQuery.where(inQueryCondition);
    }
    dQuery = dQuery.orderBy(...orderByConditions);
    if (paginationData) {
        const { page, pageSize } = paginationData;
        dQuery = dQuery.limit(pageSize).offset((page - 1) * pageSize);
    }
    const results = trx ? await trx.execute(dQuery) : await dQuery;
    if (columnsRequired) {
        return results;
    }
    return results;
}
export { executeQuery, prepareInQueryCondition, prepareOrderByQueryConditions, prepareSelectColumnsForQuery, prepareWhereQueryConditions, };
