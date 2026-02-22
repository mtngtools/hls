export interface ComposeCliArgs {
    /** Target m3u8 filename override */
    m3u8Name?: string;
    /** Whether S3 chunks verify against S3 bucket limits */
    autoVerifyChunks?: boolean;
    /** Optional ACL string applied onto S3 targets (e.g., 'public-read') */
    acl?: string;
}

export function parseComposeArgs(argv: string[]): ComposeCliArgs {
    const args: ComposeCliArgs = {
        autoVerifyChunks: true, // Defaulting to true for compose-hls S3 specs
    };
    let i = 0;

    while (i < argv.length) {
        const arg = argv[i];

        if (arg === '--m3u8-name' || arg === '-m') {
            const next = argv[++i];
            if (!next) {
                console.error(`Error: ${arg} requires a value`);
                process.exit(1);
            }
            args.m3u8Name = next;
        } else if (arg === '--no-verify') {
            args.autoVerifyChunks = false;
        } else if (arg === '--acl') {
            const next = argv[++i];
            if (!next) {
                console.error(`Error: ${arg} requires a value`);
                process.exit(1);
            }
            args.acl = next;
        }
        i++;
    }
    return args;
}
