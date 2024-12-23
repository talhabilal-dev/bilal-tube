export const healthcheck = async (req, res) => {
  try {
    res.status(200).json({
      status: "OK",
      message: "Server is running and healthy.",
    });
  } catch (error) {
    res.status(500).json({
      status: "ERROR",
      message: "Server is running but not healthy.",
    });
  }
};
