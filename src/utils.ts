export function teeAsync<T>(
    source: AsyncGenerator<T>,
): [AsyncGenerator<T>, AsyncGenerator<T>] {
    const buffer: T[] = [];
    const resolves: ((item: { item?: T; done?: boolean }) => void)[] = [];

    let done = false;

    async function* makeIterator() {
        let pos = 0;
        while (true) {
            // If we already buffered this value, yield it
            if (pos < buffer.length) {
                yield buffer[pos++];
                continue;
            }

            if (done) {
                return;
            }

            const promise = new Promise<{ item?: T; done?: boolean }>(
                (resolve) => resolves.push(resolve),
            );

            const value = await promise;
            if (value.done) return;
            yield value.item!;
            pos++;
        }
    }

    (async () => {
        for await (const item of source) {
            buffer.push(item);
            while (resolves.length) {
                resolves.shift()!({ item });
            }
        }

        done = true;
        // notify completion
        while (resolves.length) {
            resolves.shift()!({ done: true });
        }
    })();

    return [makeIterator(), makeIterator()];
}
