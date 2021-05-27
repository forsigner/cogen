import { navigateTo } from "@common/utils"

class RouterService {
  Index = "/pages/index/index";
  Test = "/package-test/pages/test/index";
  Test2 = "/pages/test2/index";

  toIndex<T>(data?: T, opt?: any) {
    navigateTo("/pages/index/index", data as any, opt as any)
  }

  toTest<T>(data?: T, opt?: any) {
    navigateTo("/package-test/pages/test/index", data as any, opt as any)
  }

  toTest2<T>(data?: T, opt?: any) {
    navigateTo("/pages/test2/index", data as any, opt as any)
  }
}

export const routerService = new RouterService()
