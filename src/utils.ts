export function teeAsync<T>(
    source: AsyncGenerator<T>,
): [AsyncGenerator<T>, AsyncGenerator<T>] {
    const buffers: T[][] = [[], []];
    let done = false;

    async function* makeIterator(index: number) {
        const buffer = buffers[index];
        while (true) {
            if (buffer.length === 0) {
                if (done) return;
                const { value, done: srcDone } = await source.next();
                if (srcDone) {
                    done = true;
                    return;
                }
                buffers[0].push(value!);
                buffers[1].push(value!);
            }
            yield buffer.shift()!;
        }
    }

    return [makeIterator(0), makeIterator(1)];
}
