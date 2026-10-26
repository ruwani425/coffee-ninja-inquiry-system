export const errorHandler = (err, req, res, next) => {
  console.error('[Error caught by global handler]:', err);

  if (err.name === 'ZodError') {
    const formatted = {};
    err.errors.forEach((e) => {
      formatted[e.path.join('.')] = e.message;
    });
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'One or more required fields contain invalid data.',
      details: formatted
    });
  }

  // Handle postgres syntax or constraint errors
  if (err.code === '23505') {
    return res.status(409).json({
      error: 'DUPLICATE_ENTRY',
      message: 'A record with this identifier already exists.'
    });
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: err.errorCode || 'INTERNAL_SERVER_ERROR',
    message: err.message || 'An unexpected server error occurred. Please try again.'
  });
};
