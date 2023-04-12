type Function = (...args: any[]) => void;

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export const functionTime = async ({
  functionToTest,
  onSuccess,
  onError,
}: {
  functionToTest: Function;
  onSuccess?: (functionTimeMs: number) => void;
  onError?: () => void;
}) => {
  let startTime = Date.now();
  let timeElapsed = 0;
  try {
    await functionToTest();
    const endTime = Date.now();
    timeElapsed = endTime - startTime;
    onSuccess?.(timeElapsed);
  } catch (error) {
    const endTime = Date.now();
    timeElapsed = endTime - startTime;
    onError?.();
    return -1;
  }
  return timeElapsed;
};

export const runTests = async ({
  n,
  functionToTest,
}: {
  n: number;
  functionToTest: Function;
}) => {
  let times = [];
  let totalTime = 0;
  let successes = 0;
  for (let i = 0; i < n; i++) {
    let time = await functionTime({ functionToTest });
    times.push(time);
    if (time >= 0) {
      successes += 1;
      totalTime += time;
    }
    console.log({ time, successes, averageTime: totalTime / successes });
    // This extra delay makes sure we don't do more than 60 requests per minute, the api limit for google sheets
    await delay(1050 - time);
  }
  console.log({ averageTime: totalTime / successes, times });
};

export const addRandomEntities = async ({
  n,
  generateEntity,
  addEntities,
}: {
  n: number;
  generateEntity: () => {};
  addEntities: (entities: any[]) => {};
}) => {
  let entities = [];
  for (let i = 0; i < n; i++) {
    entities.push(generateEntity());
  }
  await addEntities(entities);
};

/**
 * notes - test results in ms
 *
 * Querying
 * 36000 entities - average time = 885.9
 * 36000 entities - average time = 694.13
 * 1000 entities - average time = 379.55
 * 10000 entities - averaget time = 506.35
 *
 * Adding entities
 * 1 entity - average time 256.44
 * 800 entities - average time 438.72
 *
 */
