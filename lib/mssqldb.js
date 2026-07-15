import sql from "mssql";

const config = {
  user: process.env.MSSQLDB_USER,
  password: process.env.MSSQLDB_PASSWORD,
  server: process.env.MSSQLDB_SERVER,
  database: process.env.MSSQLDB_NAME,
  port: parseInt(process.env.MSSQLDB_PORT, 10),
  connectionTimeout: 180000,
  requestTimeout: 180000,
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true,
    appName: "QMApp",
    useUTC: true,
    multiSubnetFailover: true,
  },
};

export async function connectToDatabase() {
  try {
    if (!global.connectionPool) {
      global.connectionPool = await sql.connect(config);
    }
    return global.connectionPool;
  } catch (err) {
    console.error("Database connection failed: ", err);
    throw err;
  }
}

export async function executeStoredProcedure(
  procedureName,
  inputParameters = {},
  outputParameters = {},
) {
  try {
    const pool = await connectToDatabase();
    const request = pool.request();
    configureStoredProcedureRequest(request, inputParameters, outputParameters);
    return await request.execute(procedureName);
  } catch (err) {
    console.error(`Failed to execute stored procedure: ${procedureName}`, err);
    throw err;
  }
}

export function configureStoredProcedureRequest(
  request,
  inputParameters = {},
  outputParameters = {},
) {
  if (inputParameters && Object.keys(inputParameters).length > 0) {
    for (const paramName in inputParameters) {
      request.input(paramName, inputParameters[paramName]);
    }
  }

  if (outputParameters && Object.keys(outputParameters).length > 0) {
    outputParameters.forEach((param) => {
      request.output(param.name);
    });
  }
}

export async function executeStoredProcedureWithRequest(
  request,
  procedureName,
  inputParameters = {},
  outputParameters = {},
) {
  try {
    configureStoredProcedureRequest(request, inputParameters, outputParameters);
    return await request.execute(procedureName);
  } catch (err) {
    console.error(`[sp] ${procedureName}: ${err.message}`);
    throw err;
  }
}

export async function TotalRecords(dataSet) {
  return dataSet[0].TotalCount;
}

export const outputmsgParams = [
  {
    name: "outputmsg",
    dtype: sql.NVarChar,
    length: 100,
  },
];

export const outputmsgWithStatusCodeParams = [
  {
    name: "outputmsg",
    dtype: sql.NVarChar,
    length: 100,
  },
  {
    name: "statuscode",
    dtype: sql.Int,
  },
];
