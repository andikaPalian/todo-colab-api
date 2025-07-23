import { ZodError } from "zod";

export const validateBody = (schema) => (req, res, next) => {
    try {
        const parsed = schema.parse(req.body);
        req.body = parsed;
        next();
    } catch (error) {
        if (error instanceof ZodError) {
            const formatted = error.errors.map((e) => ({
                field: e.path.join("."),
                message: e.message
            }));
            return res.status(400).json({
                message: "Validation failed",
                error: formatted
            });
        }

        next(error);
    }
}