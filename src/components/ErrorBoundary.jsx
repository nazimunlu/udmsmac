import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // You can also log the error to an error reporting service
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    render() {
        if (this.state.hasError) {
            // You can render any custom fallback UI
            return (
                <div className="flex items-center justify-center min-h-screen bg-red-100 text-red-800 p-4">
                    <div className="text-center">
                        <h1 className="text-3xl font-bold mb-4">Oops! Something went wrong.</h1>
                        <p className="text-lg mb-4">We're sorry, but an unexpected error occurred.</p>
                        {this.props.showDetails && this.state.error && (
                            <details className="text-left bg-red-200 p-4 rounded-lg mt-4">
                                <summary className="font-semibold cursor-pointer">Error Details</summary>
                                <pre className="whitespace-pre-wrap text-sm mt-2">
                                    {this.state.error.toString()}
                                    <br />
                                    {this.state.errorInfo.componentStack}
                                </pre>
                            </details>
                        )}
                        <button
                            onClick={() => window.location.reload()}
                            className="mt-6 px-6 py-3 bg-red-600 text-white rounded-lg shadow-md hover:bg-red-700 transition-colors"
                        >
                            Reload Page
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
