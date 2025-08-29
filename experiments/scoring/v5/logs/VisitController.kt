
/*
 * Copyright 2012-2025 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.springframework.samples.petclinic.owner

import java.util.Map
import java.util.Optional

import org.springframework.stereotype.Controller
import org.springframework.validation.BindingResult
import org.springframework.web.bind.WebDataBinder
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.InitBinder
import org.springframework.web.bind.annotation.ModelAttribute
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping

import jakarta.validation.Valid
import org.springframework.web.servlet.mvc.support.RedirectAttributes

/**
 * @author Juergen Hoeller
 * @author Ken Krebs
 * @author Arjen Poutsma
 * @author Michael Isvy
 * @author Dave Syer
 * @author Wick Dynex
 */
@Controller
open class VisitController(private val owners: OwnerRepository) {

    @InitBinder
    fun setAllowedFields(dataBinder: WebDataBinder) {
        dataBinder.setDisallowedFields("id")
    }

    @ModelAttribute("visit")
    fun loadPetWithVisit(
        @PathVariable("ownerId") ownerId: Int,
        @PathVariable("petId") petId: Int,
        model: MutableMap<String, Any?>
    ): Visit {
        val owner = owners.findById(ownerId)
            ?: throw IllegalArgumentException("Owner not found with id: $ownerId. Please ensure the ID is correct ")

        val pet = owner.getPet(petId)
        model["pet"] = pet
        model["owner"] = owner

        val visit = Visit()
        pet.addVisit(visit)
        return visit
    }

    @GetMapping("/owners/{ownerId}/pets/{petId}/visits/new")
    fun initNewVisitForm() = "pets/createOrUpdateVisitForm"

    @PostMapping("/owners/{ownerId}/pets/{petId}/visits/new")
    fun processNewVisitForm(
        @ModelAttribute owner: Owner,
        @PathVariable petId: Int,
        @Valid visit: Visit,
        result: BindingResult,
        redirectAttributes: RedirectAttributes
    ): String {
        if (result.hasErrors()) {
            return "pets/createOrUpdateVisitForm"
        }

        owner.addVisit(petId, visit)
        owners.save(owner)
        redirectAttributes.addFlashAttribute("message", "Your visit has been booked")
        return "redirect:/owners/{ownerId}"
    }
}
