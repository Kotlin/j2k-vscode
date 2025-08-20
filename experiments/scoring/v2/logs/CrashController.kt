package org.springframework.samples.petclinic.system

import org.springframework.stereotype.Controller
import org.springframework.web.bind.annotation.GetMapping

@Controller
open class CrashController {
    @GetMapping("/oups")
    fun triggerException(): String = throw RuntimeException(
        "Expected: controller used to showcase what happens when an exception is thrown"
    )
}