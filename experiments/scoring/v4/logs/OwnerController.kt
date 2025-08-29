
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

import org.springframework.data.domain.Page
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Pageable
import org.springframework.stereotype.Controller
import org.springframework.ui.Model
import org.springframework.validation.BindingResult
import org.springframework.web.bind.WebDataBinder
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.InitBinder
import org.springframework.web.bind.annotation.ModelAttribute
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.servlet.ModelAndView
import jakarta.validation.Valid
import org.springframework.web.servlet.mvc.support.RedirectAttributes

@Controller
class OwnerController(private val owners: OwnerRepository) {

    companion object {
        private const val VIEWS_OWNER_CREATE_OR_UPDATE_FORM = "owners/createOrUpdateOwnerForm"
    }

    @InitBinder
    fun setAllowedFields(dataBinder: WebDataBinder) {
        dataBinder.disallowedFields = arrayOf("id")
    }

    @ModelAttribute("owner")
    fun findOwner(@PathVariable(name = "ownerId", required = false) ownerId: Int?): Owner {
        return ownerId?.let {
            owners.findById(it).orElseThrow {
                IllegalArgumentException("Owner not found with id: $it. Please ensure the ID is correct and the owner exists in the database.")
            }
        } ?: Owner()
    }

    fun initCreationForm(): String = VIEWS_OWNER_CREATE_OR_UPDATE_FORM

    @PostMapping("/owners/new")
    fun processCreationForm(
        @Valid owner: Owner,
        result: BindingResult,
        redirectAttributes: RedirectAttributes
    ): String {
        if (result.hasErrors()) {
            redirectAttributes.addFlashAttribute("error", "There was an error in creating the owner.")
            return VIEWS_OWNER_CREATE_OR_UPDATE_FORM
        }

        owners.save(owner)
        redirectAttributes.addFlashAttribute("message", "New Owner Created")
        return "redirect:/owners/${owner.id}"
    }

    @GetMapping("/owners/find")
    fun initFindForm(): String = "owners/findOwners"

    @GetMapping("/owners")
    fun processFindForm(
        @RequestParam(defaultValue = "1") page: Int,
        owner: Owner,
        result: BindingResult,
        model: Model
    ): String {
        // allow parameterless GET request for /owners to return all records
        if (owner.lastName == null) {
            owner.lastName = "" // empty string signifies broadest possible search
        }

        // find owners by last name
        val ownersResults = findPaginatedForOwnersLastName(page, owner.lastName!!)
        if (ownersResults.isEmpty) {
            // no owners found
            result.rejectValue("lastName", "notFound", "not found")
            return "owners/findOwners"
        }

        if (ownersResults.totalElements == 1L) {
            // 1 owner found
            val singleOwner = ownersResults.iterator().next()
            return "redirect:/owners/${singleOwner.id}"
        }

        // multiple owners found
        return addPaginationModel(page, model, ownersResults)
    }

    private fun addPaginationModel(page: Int, model: Model, paginated: Page<Owner>): String {
        val listOwners = paginated.content
        model.addAttribute("currentPage", page)
        model.addAttribute("totalPages", paginated.totalPages)
        model.addAttribute("totalItems", paginated.totalElements)
        model.addAttribute("listOwners", listOwners)
        return "owners/ownersList"
    }

    private fun findPaginatedForOwnersLastName(page: Int, lastname: String): Page<Owner> {
        val pageSize = 5
        val pageable = PageRequest.of(page - 1, pageSize)
        return owners.findByLastNameStartingWith(lastname, pageable)
    }

    @GetMapping("/owners/{ownerId}/edit")
    fun initUpdateOwnerForm(): String = VIEWS_OWNER_CREATE_OR_UPDATE_FORM

    @PostMapping("/owners/{ownerId}/edit")
    fun processUpdateOwnerForm(
        @Valid owner: Owner,
        result: BindingResult,
        @PathVariable("ownerId") ownerId: Int,
        redirectAttributes: RedirectAttributes
    ): String {
        if (result.hasErrors()) {
            redirectAttributes.addFlashAttribute("error", "There was an error in updating the owner.")
            return VIEWS_OWNER_CREATE_OR_UPDATE_FORM
        }

        if (owner.id != ownerId) {
            result.rejectValue("id", "mismatch", "The owner ID in the form does not match the URL.")
            redirectAttributes.addFlashAttribute("error", "Owner ID mismatch. Please try again.")
            return "redirect:/owners/{ownerId}/edit"
        }

        owner.id = ownerId
        owners.save(owner)
        redirectAttributes.addFlashAttribute("message", "Owner Values Updated")
        return "redirect:/owners/{ownerId}"
    }

    @GetMapping("/owners/{ownerId}")
    fun showOwner(@PathVariable("ownerId") ownerId: Int): ModelAndView {
        val owner = owners.findById(ownerId)
            .orElseThrow { IllegalArgumentException("Owner not found with id: $ownerId. Please ensure the ID is correct ") }
        return ModelAndView("owners/ownerDetails").apply {
            addObject(owner)
        }
    }
}
