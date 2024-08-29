import {dirname, resolve} from 'path';
import nodeExternals from 'webpack-node-externals';
import {fileURLToPath} from "url";

const __filename = fileURLToPath(import.meta.url);  // Get the file path
const __dirname = dirname(__filename);

export default {
    target: 'node',  // Indicating that the bundle is for a Node.js environment
    mode: 'development', // Change to 'production' for production builds
    entry: './src/index.js', // Entry point of your application
    output: {
        path: resolve(__dirname, 'dist'), // Output directory
        filename: 'bundle.cjs', // Output file name
    },
    externals: [nodeExternals()], // Exclude node_modules from the bundle
    module: {
        rules: [
            {
                test: /\.m?js$/, // Apply the rule to .js or .mjs files
                exclude: /node_modules/, // Exclude node_modules from processing
                use: {
                    loader: 'babel-loader', // Use babel-loader to transpile the files
                    options: {
                        presets: [
                            [
                                '@babel/preset-env',
                                {
                                    targets: {
                                        node: 'current' // Target the current version of Node.js
                                    }
                                }
                            ]
                        ]
                    }
                }
            }
        ]
    },
    resolve: {
        extensions: ['.js', '.mjs'], // Resolve these extensions
    }
};
