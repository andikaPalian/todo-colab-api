import cron from "node-cron";
import Task from "../models/task.model.js";

cron.schedule("0 1 * * *", async () => {
    try {
        const thresholdDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

        const result = await Task.deleteMany({
            isDeleted: true,
            deletedAt: {
                $lte: thresholdDate
            }
        });

        if (result.deletedCount === 0) {
            console.log("[Task Cleanup] No soft-deleted tasks to delete permanently.");
            return;
        }

        console.log(`[Task Cleanup] Deleted ${result.deletedCount} tasks permanently.`);
    } catch (error) {
        console.error("[Task Cleanup] Error deleting soft-deleted tasks: ", error);
    }
});