import amqp from "amqplib";

let channel: amqp.Channel;

export const connectRabbitMQ = async () => {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL!);

    channel = await connection.createChannel();

    console.log("✅ Connected to RabbitMQ (CloudAMQP)");
  } catch (error) {
    console.error("❌ Failed to connect to RabbitMQ", error);
  }
};
export const publishToQueue = async (queueName: string, message: any) => {
  if (!channel) {
    console.error("Rabbitmq channel is not intialized");
    return;
  }

  await channel.assertQueue(queueName, { durable: true });

  channel.sendToQueue(queueName, Buffer.from(JSON.stringify(message)), {
    persistent: true,
  });
};

export const invalidateChacheJob = async (cacheKeys: string[]) => {
  try {
    const message = {
      action: "invalidateCache",
      keys: cacheKeys,
    };

    await publishToQueue("cache-invalidation", message);

    console.log("✅ Cache invalidation job published to Rabbitmq");
  } catch (error) {
    console.error("❌ Failed to Publish cache on Rabbitmq", error);
  }
};
