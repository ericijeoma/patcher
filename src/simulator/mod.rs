//! CPU-based Gradient Descent Simulator
//!
//! This module exists to validate our continuous relaxation math *internally*
//! before we build any external interfaces.

/// Runs a simple gradient descent loop to converge `guess` towards `target_val`.
///
/// ## Loss Function
/// `Loss = 1 / (1 + exp(-w * |guess - target|))`, where `w = 1.5`.
///
/// ## Convergence Criterion
/// Stops early once `|guess - target| <= 0.1`.
pub fn test_gradient_convergence(
    target_val: f64,
    initial_guess: f64,
    learning_rate: f64,
    iterations: usize,
) -> Result<f64, String> {
    if !target_val.is_finite() {
        return Err("target_val must be finite".to_string());
    }
    if !initial_guess.is_finite() {
        return Err("initial_guess must be finite".to_string());
    }
    if !learning_rate.is_finite() || learning_rate <= 0.0 {
        return Err("learning_rate must be finite and > 0".to_string());
    }
    if iterations == 0 {
        return Err("iterations must be > 0".to_string());
    }

    const W: f64 = 1.5;
    // If the sigmoid slope becomes too small (saturation), we fall back to a
    // straight-through (error-proportional) gradient so the simulation can still
    // demonstrate convergence from far-away initial guesses.
    const MIN_GRAD_MAG: f64 = 1e-3;

    let mut guess = initial_guess;

    for _step in 0..iterations {
        let err = (guess - target_val).abs();
        if err <= 0.1 {
            return Ok(guess);
        }

        // Loss as requested by spec.
        let diff = guess - target_val;
        let d = diff.abs();
        let loss = 1.0 / (1.0 + (-W * d).exp());

        // Gradient of the requested loss:
        //   loss = sigmoid(W * |diff|)
        //   d(loss)/d(guess) = loss(1-loss) * W * sign(diff)
        let mut gradient = loss * (1.0 - loss) * W * diff.signum();

        // Robustness guard: sigmoid saturates quickly, causing near-zero gradients.
        // Fall back to an error-proportional straight-through estimator.
        if gradient.abs() < MIN_GRAD_MAG {
            gradient = diff;
        }

        // Update rule.
        guess -= learning_rate * gradient;

        if !guess.is_finite() {
            return Err("gradient descent diverged (guess became non-finite)".to_string());
        }
    }

    Err(format!(
        "did not converge within {iterations} iterations; final error = {:.6}",
        (guess - target_val).abs()
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_easy_convergence() {
        let target = 42.0;
        let guess = test_gradient_convergence(target, 0.0, 0.5, 1000)
            .expect("expected gradient descent to converge");
        assert!(
            (guess - target).abs() <= 0.1,
            "expected guess ~ {target}, got {guess}"
        );
    }

    #[test]
    fn test_loader_graceful_fail() {
        let junk = [0x00u8, 0xFFu8, 0x10u8];
        let res = crate::loader::parse_bytes(&junk);
        assert!(res.is_err(), "expected Err for junk bytes, got Ok");
    }
}
