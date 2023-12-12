# Webpack Cache Memory Leak

This is a basic Webpack setup to reproduce the memory leak described in ~this Webpack issue: https://github.com/webpack/webpack/issues/17857~ After further investigation I think the root cause is in `HtmlWebpackPlugin`: https://github.com/jantimon/html-webpack-plugin/issues/1835

NOTE: This is similar to https://github.com/helloitsjoe/webpack-memory-leak. It looks like a different root cause and different effect, but seems to stem from not cleaning up after child compilers.

## Summary

The [`simplified` branch](https://github.com/helloitsjoe/webpack-cache-memory-leak/tree/simplified) shows the leak with vanilla HtmlWebpackPlugin usage, but the main branch shows how much memory can leak in a use case closer to the real world, where a custom loader renders React components to HTML during the build. The libraries used during that process (`react` and `react-dom`) are stored in cache and never cleaned up, leaking a few MB on each compilation in watch mode. The leak seems to come from `HtmlWebpackPlugin` using a unique ID for each child compiler.

## How to reproduce

1. `yarn`
2. Run `webpack serve` in inspect mode: `NODE_OPTIONS=--inspect $(yarn bin webpack) serve`
3. Open a memory profiler, for example `chrome://inspect` in Chrome
4. Take a heap snapshot
5. Save `src/app.js` (or `src/index.html` on the `simplified` branch), which will cause `HtmlWebpackPlugin` to create a child compiler. Save a few times.
6. Take a second heap snapshot and notice the difference in size
7. Take a third snapshot and select `Objects allocated between snapshots 1 and 2`, or select `Comparison` view and compare snapshot 3 to 1.

Here's where this is different from https://github.com/helloitsjoe/webpack-memory-leak:

Find and open the `(string)` constructor in the snapshot diff, it should be the first or second item when sorting by retained size or size delta. You should see multiple copies of the same strings, including source files (`react` and `react-dom`) used in `src/react-loader.js`, and this string from `EvalDevToolModulePlugin`:

```
/* * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development") ...
```

A new copy of each of these is added every recompile. It looks to me like these are being [cached in a `Map` in `MemoryCachePlugin`](https://github.com/webpack/webpack/blob/87660921808566ef3b8796f8df61bd79fc026108/lib/cache/MemoryCachePlugin.js#L27) using a child compiler ID, for example (note the `HtmlWebpackPlugin_0-7`, the 7th time I ran a recompilation):

```
'HtmlWebpackCompiler|0|Compilation/codeGeneration|javascript/esm|data:text/javascript,__webpack_public_path__ = __webpack_base_uri__ = htmlWebpackPluginPublicPath;|HtmlWebpackPlugin_0-7'
```

I'm not sure this is the only place these are being cached, but I can see that cache growing by a number of entries on each recompile.

<details open>
  <summary>Duplicated strings after 5 recompilations</summary>
  
  <img width="1707" alt="strings" src="https://github.com/helloitsjoe/webpack-cache-memory-leak/assets/8823810/499fb875-7067-406f-b09b-d733ad1889ff">

</details>

I also noticed the number of instances of most of the `Source` classes have many more new than deleted when comparing to a previous snapshot:

<details open>
  <summary>Sources after 5 recompilations</summary>
  
  <img width="1707" alt="Sources" src="https://github.com/helloitsjoe/webpack-cache-memory-leak/assets/8823810/820155a6-8678-4e61-bec1-c0d56a86bd3c">

</details>

## The Fix

As mentioned in https://github.com/jantimon/html-webpack-plugin/issues/1835, it looks like it might be as simple as reverting [this commit](https://github.com/jantimon/html-webpack-plugin/commit/aa64b824606896ed01daf7e6da80429785ecd7bc). It doesn't look like that `id` is used anywhere else, so there shouldn't be any downstream effects. However, it's not clear to me why that change was made in the first place, so there may be something I'm not considering.
