/**
 * Responds with a simple JSON object indicating the server's health.
 * Useful for load balancers and Kubernetes liveness probes.
 *
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 *
 * @throws {ApiError} 500 - If there is an error during the healthcheck.
 */
export const healthcheck = async (req, res) => {
  try {
    res.status(200).json({
      status: "OK",
      message: "Server is running and healthy.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: "ERROR",
      message: "Server is running but not healthy.",
    });
  }
};
