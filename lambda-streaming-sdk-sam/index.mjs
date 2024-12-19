import {
    LambdaClient,
    InvokeWithResponseStreamCommand,
    paginateListFunctions
} from "@aws-sdk/client-lambda";

// Set the AWS region
const REGION = "us-east-1";

// Initialize the Lambda client
const lambda = new LambdaClient({ region: REGION });

// Function to get the ARN of the Lambda function based on its name
const getExampleFunctionArn = async (functionName) => {
    const paginatorConfig = {
        client: lambda,
        pageSize: 50
    };

    const listFunctionParams = {};

    try {
        const paginator = paginateListFunctions(paginatorConfig, listFunctionParams);

        const EXAMPLE_FUNCTION_NAME_PREFIX = `lambda-streaming-sdk-sam-${functionName}`;
        for await (const page of paginator) {
            if (!page.Functions) return null;

            let result = null;

            page.Functions.forEach(fn => {
                // console.log(`Checking function: ${fn.FunctionName}`); // Log each function name
                if (fn.FunctionName.startsWith(EXAMPLE_FUNCTION_NAME_PREFIX)) {
                    result = fn.FunctionArn;
                    console.log(`Found function ARN: ${result}`); // Log the found ARN
                }
            });

            if (result) return result;
        } 
    } catch (err) {
        console.log("Error while listing functions:", err);
    }
    return null; // Return null explicitly if not found
}

// Function to decode a Uint8Array to a string
function Decodeuint8arr(uint8array) {
    return new TextDecoder("utf-8").decode(uint8array);
}

// Main function to invoke the Lambda function
const main = async (functionName) => {
    const targetFunctionArn = await getExampleFunctionArn(functionName);

    if (!targetFunctionArn) {
        console.log("Could not find the reference streaming function. Have you deployed it yet?");
        return;
    }

    const params = {
        FunctionName: targetFunctionArn,
        LogType: "Tail"
    };

    try {
        // Call the InvokeWithResponseStream API
        const response = await lambda.send(new InvokeWithResponseStreamCommand(params));

        // The response should contain an EventStream Async Iterator
        const events = response.EventStream;

        // Each `event` is a chunk of the streamed response.
        for await (const event of events) {
            // Log the event for debugging purposes
            console.log("Received event:", event);

            // `PayloadChunk`: These contain the actual raw bytes of the chunk
            if (event.PayloadChunk) {
                // Decode the raw bytes into a string a human can read
                console.log("Payload Chunk:", Decodeuint8arr(event.PayloadChunk.Payload));
            }

            // `InvokeComplete`: This event is sent when the function is done streaming.
            if (event.InvokeComplete) {
                if (event.InvokeComplete.ErrorCode) {
                    console.log("Error Code:", event.InvokeComplete.ErrorCode);
                    console.log("Details:", event.InvokeComplete.ErrorDetails);
                }

                if (event.InvokeComplete.LogResult) {
                    const buff = Buffer.from(event.InvokeComplete.LogResult, 'base64');
                    console.log("Logs:", buff.toString("utf-8"));
                }
            }
        }
    } catch (err) {
        console.log("Error invoking Lambda function:", err);
    }
}

// Test the functions
console.log("Happy path streaming example");
await main("HappyPath");

console.log("Midstream error example");
await main("MidstreamError");

console.log("Timeout example");
await main("Timeout");